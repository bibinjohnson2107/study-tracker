import re
import json
import os
import logging
from typing import Tuple, List

logger = logging.getLogger(__name__)

class AIService:
    @staticmethod
    def validate_roadmap_structure(data: dict) -> Tuple[bool, str]:
        """Validate JSON schema returned by LLM or heuristic parser."""
        if not isinstance(data, dict):
            return False, "Output must be a JSON object."
            
        title = data.get("title") or data.get("study_goal", {}).get("title")
        if not title or not isinstance(title, str) or not title.strip():
            return False, "Roadmap must contain a non-empty 'title' string."
            
        modules = data.get("modules", [])
        if not isinstance(modules, list):
            return False, "Roadmap must contain a 'modules' list."

        if len(modules) == 0:
            return False, "Roadmap must contain at least one module."

        for m_idx, module in enumerate(modules):
            if not isinstance(module, dict) or "title" not in module or not module["title"].strip():
                return False, f"Module #{m_idx+1} is missing a valid title."
                
            topics = module.get("topics", [])
            if not isinstance(topics, list):
                return False, f"Module '{module['title']}' must have a list of topics."

            for t_idx, topic in enumerate(topics):
                if isinstance(topic, str):
                    continue
                if not isinstance(topic, dict) or "title" not in topic or not topic["title"].strip():
                    return False, f"Topic #{t_idx+1} in module '{module['title']}' is invalid."
                    
                subtopics = topic.get("subtopics", [])
                if not isinstance(subtopics, list):
                    return False, f"Subtopics for '{topic['title']}' must be a list."

        return True, ""

    @classmethod
    def analyze_roadmap_text(cls, raw_text: str, api_key: str = None) -> dict:
        raw_text = raw_text.strip()
        if not raw_text:
            raise ValueError("Roadmap text cannot be empty.")

        # 1. Direct JSON check (Standard schema, Schema with metadata/supporting_content, or Tree/Children schema)
        if raw_text.startswith('{') and raw_text.endswith('}'):
            try:
                json_data = json.loads(raw_text)
                is_valid, _ = cls.validate_roadmap_structure(json_data)
                if is_valid:
                    return cls._normalize_output_schema(json_data)

                converted = cls._convert_tree_json(json_data)
                if converted:
                    return cls._normalize_output_schema(converted)
            except Exception as json_err:
                logger.debug(f"Direct JSON parsing attempt failed: {json_err}")

        # 2. Try LLM provider if API key available
        gemini_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY")
        if gemini_key:
            try:
                result = cls._call_llm(raw_text, gemini_key)
                is_valid, err = cls.validate_roadmap_structure(result)
                if is_valid:
                    return cls._normalize_output_schema(result)
                logger.warning(f"LLM produced invalid JSON structure: {err}. Falling back to heuristic parser.")
            except Exception as e:
                logger.warning(f"LLM API call failed: {e}. Falling back to heuristic parser.")

        # 3. Try Existing Base Heuristic Parser
        try:
            parsed = cls._heuristic_parser(raw_text)
            is_valid, _ = cls.validate_roadmap_structure(parsed)
            if is_valid and cls._is_quality_parse(parsed):
                return cls._normalize_output_schema(parsed)
        except Exception:
            pass

        # 4. Fallback Normalizer / Extended Semantic Parser
        normalized_parsed = cls._extended_semantic_parser(raw_text)
        is_valid, err = cls.validate_roadmap_structure(normalized_parsed)
        if not is_valid:
            raise ValueError(f"Could not structure this roadmap: {err}")
        return cls._normalize_output_schema(normalized_parsed)

    @classmethod
    def _normalize_output_schema(cls, data: dict) -> dict:
        """Ensures title, modules, metadata, and supporting_content are present."""
        sg = data.get("study_goal", {})
        title = data.get("title") or (sg.get("title") if isinstance(sg, dict) else None) or "Study Roadmap"
        description = data.get("description") or (sg.get("description") if isinstance(sg, dict) else None)
        
        modules = data.get("modules", [])
        clean_modules = []

        # Filter out non-learning container modules
        ignored_containers = ['metadata', 'target', 'level', 'estimated duration', 'recommended study time', 'important notes', 'overview', 'introduction']
        
        for m in modules:
            if not isinstance(m, dict):
                continue
            m_title = m.get("title", "").strip()
            if m_title.lower() in ignored_containers and len(modules) > 1:
                continue

            topics = m.get("topics", [])
            clean_topics = []
            for t in topics:
                if isinstance(t, str):
                    t_title = t.strip()
                    t_subs = []
                elif isinstance(t, dict):
                    t_title = t.get("title", "").strip()
                    t_subs = t.get("subtopics", [])
                else:
                    continue

                if not t_title or t_title.lower() in ignored_containers or t_title.startswith('http://') or t_title.startswith('https://'):
                    continue
                
                # Check subtopics
                norm_subs = []
                for s in t_subs:
                    if isinstance(s, str):
                        norm_subs.append(s)
                    elif isinstance(s, dict):
                        norm_subs.append(s.get("title", ""))
                
                clean_topics.append({"title": t_title, "subtopics": norm_subs})

            if clean_topics or len(modules) == 1:
                clean_modules.append({"title": m_title, "topics": clean_topics})

        return {
            "title": title,
            "description": description,
            "metadata": data.get("metadata", {
                "target": None,
                "level": None,
                "difficulty": None,
                "estimated_duration": None,
                "recommended_study_time": None
            }),
            "modules": clean_modules if clean_modules else modules,
            "supporting_content": data.get("supporting_content", {
                "prerequisites": [],
                "projects": [],
                "resources": [],
                "recommendations": [],
                "optional_items": []
            })
        }

    @classmethod
    def _convert_tree_json(cls, json_data: dict) -> dict:
        if isinstance(json_data, dict) and ("study_goal" in json_data or "structure" in json_data):
            sg = json_data.get("study_goal", {})
            title = (sg.get("title") if isinstance(sg, dict) else None) or json_data.get("title") or "Study Roadmap"
            modules = []
            struct_list = json_data.get("structure") or json_data.get("modules") or []
            for m_node in struct_list:
                m_title = m_node.get("title") or m_node.get("name") or "Module"
                m_desc = m_node.get("description", "")
                topics = []
                children = m_node.get("children") or m_node.get("topics") or []
                for t_node in children:
                    t_title = t_node.get("title") or t_node.get("name") or "Topic"
                    t_subs = []
                    sub_children = t_node.get("children") or t_node.get("subtopics") or []
                    for sub in sub_children:
                        s_title = sub.get("title") if isinstance(sub, dict) else str(sub)
                        t_subs.append(s_title)
                    topics.append({"title": t_title, "subtopics": t_subs})
                modules.append({"title": m_title, "description": m_desc, "topics": topics})
            return {"title": title, "modules": modules}
        return None

    @classmethod
    def _is_quality_parse(cls, parsed: dict) -> bool:
        if not parsed or "modules" not in parsed or len(parsed["modules"]) == 0:
            return False
        if len(parsed["modules"]) == 1:
            mod = parsed["modules"][0]
            if mod.get("title") in ["General", "General Fundamentals"] and len(mod.get("topics", [])) == 1:
                if mod["topics"][0].get("title") in ["Overview", "Target", "Level", "Estimated duration"]:
                    return False
        total_topics = sum(len(m.get("topics", [])) for m in parsed.get("modules", []))
        return total_topics >= 1

    @classmethod
    def _call_llm(cls, text: str, api_key: str) -> dict:
        return cls._heuristic_parser(text)

    @classmethod
    def _clean_portion_name(cls, raw: str) -> Tuple[str, List[str]]:
        raw = raw.strip()
        # Suppress URLs completely from becoming topics
        if raw.startswith('http://') or raw.startswith('https://'):
            return "", []

        # Strip emojis safely using 8-character Unicode escapes
        raw = re.sub(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF\u2600-\u27BF\u2b50\u2b55\u231a\u231b]', '', raw).strip()
        # Remove leading bullets, numbers, markdown headers
        raw = re.sub(r'^[#*=\-\•\+\d\.\s]+', '', raw).strip()
        # Strip bold syntax **
        raw = re.sub(r'\*\*(.*?)\*\*', r'\1', raw).strip()
        # Clean backticks wrapping code symbols
        raw = re.sub(r'`([^`]+)`', r'\1', raw).strip()
        extra_subtopics = []

        if not raw:
            return "", []

        # Ignore non-learning content & metadata keywords completely
        non_learning_exact = [
            'target', 'level', 'estimated duration', 'recommended study time', 'duration',
            'difficulty', 'timeframe', 'prerequisites', 'projects', 'resources', 'resource',
            'learn:', 'topics:', 'learn', 'topics', 'overview', 'introduction', 'important notes',
            'summary', 'conclusion', 'roadmap', 'study plan', 'general fundamentals'
        ]
        if raw.lower().strip(': ') in non_learning_exact:
            return "", []

        # Ignore metadata prefix lines ("Target: AI Engineer", "Level: Intermediate")
        if re.match(r'^(target|level|estimated duration|recommended study time|duration|difficulty|timeframe)\s*:', raw.lower()):
            return "", []

        # Ignore common conversational filler/commentary phrases & projects
        conversational_patterns = [
            r'^(you should|you don\'t|this is|since you|once your|given that|for an|for interviews|the biggest|focus on|here is|learn enough|now learn|understand the difference|especially|this path|focuses strictly):?',
            r'^(you should be comfortable with|understand|learn|then understand|for interviews|master|focus on|since you|given that|the biggest mistake|here is|this is where):?$',
            r'^(learn|understand|master|practice|this is|see also|note):?$',
            r'^(if your goal is|you should learn|before learning|make sure you|don\'t learn|pick one|some topics|could the user|build a|create a|implement a|build an|project:):?'
        ]
        low_raw = raw.lower().strip()
        for pat in conversational_patterns:
            if re.search(pat, low_raw):
                return "", []

        # Check parenthetical explanation: "FastAPI (Python Web Framework)"
        paren_match = re.match(r'^([^\(\)]{2,60})\s*\(([^\)]+)\)$', raw)
        if paren_match:
            title = paren_match.group(1).strip()
            extra_info = paren_match.group(2).strip()
            if extra_info:
                extra_subtopics.append(re.sub(r'^\*+|\*+$', '', extra_info).strip())
            return title, extra_subtopics

        # Check separators like ':', ' - ', ' — ', ' – '
        parts = re.split(r'\s*[:—–]\s*|\s+\-\s+', raw, maxsplit=1)
        if len(parts) == 2:
            candidate_title, candidate_desc = parts[0].strip(), parts[1].strip()

            # Handle "Phase 1: Canvas Apps & Fundamentals" -> Title: "Phase 1 — Canvas Apps & Fundamentals"
            if re.match(r'^(phase|step|part|section|module|chapter|week|month|quarter)\s+\d+$', candidate_title.lower()):
                title = f"{candidate_title} — {candidate_desc}"
                return title, []

            if 2 <= len(candidate_title) <= 50 and len(candidate_title.split()) <= 7:
                title = candidate_title
                if candidate_desc:
                    sub_items = [re.sub(r'^\*+|\*+$', '', s).strip() for s in re.split(r'[,;]\s*', candidate_desc) if s.strip()]
                    extra_subtopics.extend([s for s in sub_items if s])
                return title, extra_subtopics

        if len(raw) > 60:
            short_part = re.split(r'[.,;]', raw)[0].strip()
            words = short_part.split()
            if len(words) > 7:
                title = " ".join(words[:6])
            else:
                title = short_part
            remainder = raw[len(title):].strip(',. ')
            if remainder:
                extra_subtopics.append(re.sub(r'^\*+|\*+$', '', remainder).strip())
            return title, extra_subtopics

        return raw, extra_subtopics

    @classmethod
    def _heuristic_parser(cls, text: str) -> dict:
        lines = [line.rstrip() for line in text.splitlines() if line.strip()]
        if not lines:
            return {"title": "Study Roadmap", "modules": []}

        title = "Study Roadmap"
        start_idx = 0
        metadata = {
            "target": None,
            "level": None,
            "difficulty": None,
            "estimated_duration": None,
            "recommended_study_time": None
        }

        # Inspect top lines for metadata
        for idx, line in enumerate(lines[:10]):
            stripped = line.strip()
            meta_match = re.match(r'^(target|level|difficulty|estimated duration|recommended study time)\s*:\s*(.+)$', stripped, flags=re.I)
            if meta_match:
                key = meta_match.group(1).lower().replace(' ', '_')
                metadata[key] = meta_match.group(2).strip()

        if metadata["target"]:
            title = metadata["target"]

        if title == "Study Roadmap":
            for idx, line in enumerate(lines[:10]):
                stripped = line.strip()
                if re.match(r'^(target|level|difficulty|estimated duration|recommended study time)\s*:', stripped, flags=re.I):
                    continue
                if re.match(r'^#{1,2}\s+(.+)$', stripped) or 'roadmap' in stripped.lower():
                    clean_title = re.sub(r'^[#*=\-\d\.\s]+', '', stripped).strip()
                    clean_title = re.sub(r'\*\*(.*?)\*\*', r'\1', clean_title).strip()
                    clean_title = re.sub(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF\u2600-\u27BF]', '', clean_title).strip()
                    if len(clean_title) >= 3 and len(clean_title) <= 80 and ('roadmap' in clean_title.lower() or 'path' in clean_title.lower() or 'developer' in clean_title.lower() or 'engineer' in clean_title.lower()):
                        title = clean_title
                        start_idx = idx + 1
                        break

        modules = []
        current_module = None
        current_topic = None
        in_code_block = False
        next_is_project = False
        next_is_resource = False
        supporting_content = {
            "prerequisites": [],
            "projects": [],
            "resources": [],
            "recommendations": [],
            "optional_items": []
        }

        def ensure_module(mod_title="General Fundamentals"):
            nonlocal current_module, modules
            if not current_module or current_module["title"] != mod_title:
                current_module = {"title": mod_title, "topics": []}
                modules.append(current_module)
            return current_module

        for i in range(start_idx, len(lines)):
            line = lines[i]
            stripped = line.strip()

            if stripped.startswith('```'):
                in_code_block = not in_code_block
                continue

            if in_code_block:
                if current_topic and stripped and not stripped.startswith('↓') and not stripped.startswith('│') and not stripped.startswith('┌'):
                    if len(current_topic["subtopics"]) < 10:
                        current_topic["subtopics"].append(stripped)
                continue

            if stripped == '---' or stripped == '***':
                continue

            # Check next line flags
            if next_is_project:
                supporting_content["projects"].append(stripped)
                next_is_project = False
                continue

            if next_is_resource:
                supporting_content["resources"].append(stripped)
                next_is_resource = False
                continue

            if stripped.lower().rstrip(':') in ['project', 'projects', 'hands-on project']:
                next_is_project = True
                continue

            if stripped.lower().rstrip(':') in ['resource', 'resources', 'useful links', 'documentation']:
                next_is_resource = True
                continue

            # Metadata line check
            meta_match = re.match(r'^(target|level|difficulty|estimated duration|recommended study time)\s*:\s*(.+)$', stripped, flags=re.I)
            if meta_match:
                key = meta_match.group(1).lower().replace(' ', '_')
                metadata[key] = meta_match.group(2).strip()
                continue

            # Projects / Resources check
            if stripped.lower().startswith(('project:', 'hands-on project:', 'build:')):
                proj = re.sub(r'^(project|hands-on project|build):', '', stripped, flags=re.I).strip()
                if proj:
                    supporting_content["projects"].append(proj)
                continue

            if stripped.lower().startswith(('resource:', 'resources:', 'useful links:', 'recommended:')):
                res = re.sub(r'^(resource|resources|useful links|recommended):', '', stripped, flags=re.I).strip()
                if res:
                    supporting_content["resources"].append(res)
                continue

            # Check Arrow sequence (Python → Django → APIs)
            if ('→' in stripped or '->' in stripped or '=>' in stripped) and not stripped.startswith('#'):
                parts = re.split(r'\s*(?:→|->|=>)\s*', stripped)
                parts = [p.strip() for p in parts if p.strip()]
                if len(parts) >= 2:
                    mod = ensure_module("Learning Flow")
                    for p in parts:
                        t_name, _ = cls._clean_portion_name(p)
                        if t_name:
                            mod["topics"].append({"title": t_name, "subtopics": []})
                    continue

            # Markdown Table parsing (| Col 1 | Col 2 | Col 3 |)
            if stripped.startswith('|') and stripped.endswith('|'):
                table_cells = [cell.strip() for cell in stripped.split('|')[1:-1] if cell.strip()]
                if not table_cells or all(re.match(r'^[\:\-\s]+$', c) for c in table_cells):
                    continue
                if any(c.lower() in ['focus area', 'key features', 'impact', 'topic', 'feature'] for c in table_cells):
                    continue

                topic_name = re.sub(r'\*\*(.*?)\*\*', r'\1', table_cells[0]).strip()
                subtopics = [re.sub(r'\*\*(.*?)\*\*', r'\1', c).strip() for c in table_cells[1:]]
                
                mod = current_module or ensure_module("Product Capabilities")
                current_topic = {"title": topic_name, "subtopics": subtopics}
                mod["topics"].append(current_topic)
                continue

            indent_level = len(line) - len(line.lstrip())

            header_match = re.match(r'^(#{1,4})\s+(.+)$', stripped)
            numbered_sec_match = re.match(r'^(?:\d+\.\s+)+(.+)$', stripped)
            phase_or_module_match = re.match(r'^(?:phase|week|month|quarter|step|part|stage|module|chapter|section)\s+\d+[:\s\—\-]', stripped, flags=re.IGNORECASE)
            bullet_match = re.match(r'^(?:[\-\*\•\+]\s+|\d+\.\d+\s+|\s*[\-\*\•]\s*)(.+)$', stripped)

            if (header_match or phase_or_module_match or (numbered_sec_match and indent_level == 0)) and not bullet_match:
                header_text = header_match.group(2).strip() if header_match else stripped
                mod_name, _ = cls._clean_portion_name(header_text)
                if not mod_name:
                    mod_name = re.sub(r'^[#*=\-\d\.\s]+', '', header_text).strip()
                
                if mod_name and len(mod_name) >= 2 and mod_name.lower() not in ['metadata', 'target', 'level', 'estimated duration']:
                    current_module = {"title": mod_name, "topics": []}
                    modules.append(current_module)
                    current_topic = None
                continue

            if bullet_match:
                raw_item = bullet_match.group(1).strip()
                item_title, extra_subs = cls._clean_portion_name(raw_item)

                if not item_title:
                    continue

                if indent_level >= 4 and current_topic:
                    current_topic["subtopics"].append(item_title)
                    current_topic["subtopics"].extend(extra_subs)
                else:
                    mod = current_module or ensure_module("General Fundamentals")
                    current_topic = {"title": item_title, "subtopics": extra_subs}
                    mod["topics"].append(current_topic)

            else:
                item_title, extra_subs = cls._clean_portion_name(stripped)
                if not item_title:
                    continue

                if indent_level >= 4 and current_topic:
                    current_topic["subtopics"].append(item_title)
                    current_topic["subtopics"].extend(extra_subs)
                else:
                    mod = current_module or ensure_module("General Fundamentals")
                    current_topic = {"title": item_title, "subtopics": extra_subs}
                    mod["topics"].append(current_topic)

        modules = [m for m in modules if len(m["topics"]) > 0]
        if not modules:
            modules = [{"title": "General", "topics": [{"title": "Overview", "subtopics": []}]}]

        return {
            "title": title,
            "metadata": metadata,
            "modules": modules,
            "supporting_content": supporting_content
        }

    @classmethod
    def _extended_semantic_parser(cls, text: str) -> dict:
        """
        Fallback normalizer layer for complex, messy, arrow-based, project-heavy,
        timeline-based, or non-standard LLM roadmaps.
        """
        lines = [line.rstrip() for line in text.splitlines() if line.strip()]
        if not lines:
            return {"title": "Study Roadmap", "modules": []}

        title = "Study Roadmap"
        start_idx = 0
        metadata = {
            "target": None,
            "level": None,
            "difficulty": None,
            "estimated_duration": None,
            "recommended_study_time": None
        }

        for idx, line in enumerate(lines[:10]):
            stripped = line.strip()
            meta_match = re.match(r'^(target|level|difficulty|estimated duration|recommended study time)\s*:\s*(.+)$', stripped, flags=re.I)
            if meta_match:
                key = meta_match.group(1).lower().replace(' ', '_')
                metadata[key] = meta_match.group(2).strip()

        if metadata["target"]:
            title = metadata["target"]

        if title == "Study Roadmap":
            for idx, line in enumerate(lines[:10]):
                stripped = line.strip()
                if re.match(r'^(target|level|difficulty|estimated duration|recommended study time)\s*:', stripped, flags=re.I):
                    continue
                clean_line = re.sub(r'^[#*=\-\d\.\s]+', '', stripped).strip()
                clean_line = re.sub(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF\u2600-\u27BF]', '', clean_line).strip()
                clean_line = re.sub(r'\*\*(.*?)\*\*', r'\1', clean_line).strip()
                if clean_line and ('roadmap' in clean_line.lower() or 'path' in clean_line.lower() or 'developer' in clean_line.lower() or 'engineer' in clean_line.lower()):
                    if 3 <= len(clean_line) <= 80:
                        title = clean_line
                        start_idx = idx + 1
                        break

        modules = []
        current_module = None
        current_topic = None
        in_code_block = False
        next_is_project = False
        next_is_resource = False
        supporting_content = {
            "prerequisites": [],
            "projects": [],
            "resources": [],
            "recommendations": [],
            "optional_items": []
        }

        def ensure_mod(m_name="Core Knowledge"):
            nonlocal current_module, modules
            if not current_module or current_module["title"] != m_name:
                current_module = {"title": m_name, "topics": []}
                modules.append(current_module)
            return current_module

        def add_topic_item(t_title, subs=None):
            nonlocal current_topic
            if not t_title or len(t_title) < 2:
                return
            if t_title.startswith('http://') or t_title.startswith('https://'):
                supporting_content["resources"].append(t_title)
                return

            mod = current_module or ensure_mod("Core Knowledge")
            current_topic = {"title": t_title, "subtopics": subs or []}
            mod["topics"].append(current_topic)

        for i in range(start_idx, len(lines)):
            line = lines[i]
            stripped = line.strip()

            if stripped.startswith('```'):
                in_code_block = not in_code_block
                continue

            if in_code_block:
                if current_topic and not stripped.startswith('↓') and not stripped.startswith('│') and not stripped.startswith('┌'):
                    if len(current_topic["subtopics"]) < 10:
                        current_topic["subtopics"].append(stripped)
                continue

            if stripped in ['---', '***', '===']:
                continue

            # Check next line flags
            if next_is_project:
                supporting_content["projects"].append(stripped)
                next_is_project = False
                continue

            if next_is_resource:
                supporting_content["resources"].append(stripped)
                next_is_resource = False
                continue

            if stripped.lower().rstrip(':') in ['project', 'projects', 'hands-on project']:
                next_is_project = True
                continue

            if stripped.lower().rstrip(':') in ['resource', 'resources', 'useful links', 'documentation']:
                next_is_resource = True
                continue

            # Metadata check
            meta_match = re.match(r'^(target|level|difficulty|estimated duration|recommended study time)\s*:\s*(.+)$', stripped, flags=re.I)
            if meta_match:
                key = meta_match.group(1).lower().replace(' ', '_')
                metadata[key] = meta_match.group(2).strip()
                continue

            # Detect Arrow Flow Sequences ("Python → Django → APIs" or "Python -> Django -> APIs")
            if ('→' in stripped or '->' in stripped or '=>' in stripped) and not stripped.startswith('#'):
                parts = re.split(r'\s*(?:→|->|=>)\s*', stripped)
                parts = [p.strip() for p in parts if p.strip()]
                if len(parts) >= 2:
                    mod = ensure_mod("Learning Sequence")
                    for p in parts:
                        t_name, _ = cls._clean_portion_name(p)
                        if t_name:
                            add_topic_item(t_name)
                    continue

            if stripped in ['↓', 'v', '│', '||', '->']:
                continue

            # Detect Markdown Tables (| Col 1 | Col 2 |)
            if stripped.startswith('|') and stripped.endswith('|'):
                table_cells = [cell.strip() for cell in stripped.split('|')[1:-1] if cell.strip()]
                if not table_cells or all(re.match(r'^[\:\-\s]+$', c) for c in table_cells):
                    continue
                if any(c.lower() in ['focus area', 'key features', 'impact', 'topic', 'feature', 'phase', 'topics', 'project', 'enhancements', 'duration'] for c in table_cells):
                    continue

                topic_name = re.sub(r'\*\*(.*?)\*\*', r'\1', table_cells[0]).strip()
                topic_name, _ = cls._clean_portion_name(topic_name)
                subtopics = [re.sub(r'\*\*(.*?)\*\*', r'\1', c).strip() for c in table_cells[1:]]
                
                if topic_name:
                    add_topic_item(topic_name, subtopics)
                continue

            indent_level = len(line) - len(line.lstrip())

            # Detect Headers / Modules
            is_header = bool(re.match(r'^(#{1,4})\s+(.+)$', stripped))
            is_numbered_sec = bool(re.match(r'^(?:\d+\.|\d+\))\s+(.+)$', stripped))
            is_phase_or_week = bool(re.match(r'^(?:phase|week|month|quarter|step|part|stage|module|chapter|section)\s+\d+[:\s\—\-]', stripped.lower()))
            is_specialization = bool(re.match(r'^(choose a specialization|specialization|branches|optional|prerequisites|projects|resources):?$', stripped.lower()))

            if is_header or is_phase_or_week or (is_numbered_sec and indent_level == 0) or (is_specialization and indent_level == 0):
                mod_name, _ = cls._clean_portion_name(stripped)
                if not mod_name:
                    mod_name = re.sub(r'^[#*=\-\d\.\s]+', '', stripped).strip()
                
                if mod_name and len(mod_name) >= 2 and mod_name.lower() not in ['metadata', 'target', 'level', 'estimated duration']:
                    current_module = {"title": mod_name, "topics": []}
                    modules.append(current_module)
                    current_topic = None
                continue

            # Detect Bullet points or List items
            bullet_match = re.match(r'^(?:[\-\*\•\+\>✓☑☐]\s+|\d+[\.\)]\d*\s+|\s*[\-\*\•\>]\s*)(.+)$', stripped)
            item_raw = bullet_match.group(1).strip() if bullet_match else stripped

            # Special semantic roles: Projects / Resources / Prerequisites
            if item_raw.lower().startswith(('project:', 'hands-on project:', 'build:')):
                proj_title = re.sub(r'^(project|hands-on project|build):', '', item_raw, flags=re.I).strip()
                if proj_title:
                    supporting_content["projects"].append(proj_title)
                continue

            if item_raw.lower().startswith(('resource:', 'resources:', 'useful links:', 'recommended:')):
                res_info = re.sub(r'^(resource|resources|useful links|recommended):', '', item_raw, flags=re.I).strip()
                if res_info:
                    supporting_content["resources"].append(res_info)
                continue

            item_title, extra_subs = cls._clean_portion_name(item_raw)

            if not item_title:
                continue

            if indent_level >= 4 and current_topic:
                current_topic["subtopics"].append(item_title)
                current_topic["subtopics"].extend(extra_subs)
            else:
                add_topic_item(item_title, extra_subs)

        # Remove empty modules
        modules = [m for m in modules if len(m["topics"]) > 0]
        if not modules:
            modules = [{"title": "General Roadmap", "topics": [{"title": "Core Learning Topics", "subtopics": []}]}]

        return {
            "title": title,
            "metadata": metadata,
            "modules": modules,
            "supporting_content": supporting_content
        }
