import sys
import os
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'studytracker.settings')
import django
django.setup()

from apps.ai_roadmap.services import AIService

powerapps_text = """Focusing exclusively on **Microsoft Power Apps**, here is both the tailored developer learning roadmap and Microsoft's official product feature roadmap for 2026.

---

## 1. Power Apps Developer Learning Roadmap

This path focuses strictly on building, designing, and extending Canvas and Model-Driven apps using **Power Fx**, **Dataverse**, and the **Power Apps Component Framework (PCF)**.

```
[Phase 1: Canvas Apps] ➔ [Phase 2: Dataverse & Model-Driven] ➔ [Phase 3: Advanced Power Fx] ➔ [Phase 4: Pro-Dev & PCF]
```

### Phase 1: Canvas Apps & Fundamentals

* **UI Layouts & Controls:** Galleries, Edit/Display Forms, Input Controls, and Responsive Containers (Horizontal/Vertical/Grid Containers).
* **Essential Power Fx:** Core functions like `Filter()`, `LookUp()`, `Patch()`, `Collect()`, `Navigate()`, and state variables (`UpdateContext`, `Set`).
* **Data Sources:** Connecting apps to SharePoint Lists, SQL Server, and standard OData connectors.
* **Hands-on Project:** Build a custom Canvas App for internal equipment/device checkout.

### Phase 2: Dataverse & Model-Driven Apps

* **Dataverse Architecture:** Standard and custom tables, column data types, choice columns, relationships (1:N, N:1, N:N), and lookups.
* **Model-Driven Designer:** Creating views, system forms, charts, dashboards, and Business Process Flows (BPFs).
* **Logic & Validation:** Configuring Business Rules, calculated/rollup fields, and column level security.
* **Hands-on Project:** Build a Model-Driven CRM or Vendor Management system using Dataverse.

### Phase 3: Advanced Power Fx & Offline Architecture

* **Advanced Power Fx:** User Defined Types (UDTs), custom components, component libraries, and named formulas (`With()`, `Concurrent()`).
* **Data Delegation:** Writing delegable queries to handle large datasets (>2,000 records) without performance bottlenecks.
* **Offline-First Apps:** Configuring offline profiles via FetchXML, offline Dataverse sync, and real-time online/offline toggling.

### Phase 4: Pro-Developer Extensibility & Governance

* **Power Apps Component Framework (PCF):** Building custom web controls using React, TypeScript, and the Power Apps CLI.
* **Client Scripting & Web Resources:** JavaScript/TypeScript event handlers for Model-Driven app forms (`Xrm.Page` / `executionContext`).
* **Solution Management:** Packaging apps into Managed vs. Unmanaged solutions, handling environments (Dev/Test/Prod), and solution pipelines.

---

## 2. Microsoft Power Apps Official Product Roadmap (2026 Feature Releases)

Microsoft's roadmap for Power Apps focuses on four major capability pillars:

| Focus Area | Key Features & Enhancements | Impact |
| --- | --- | --- |
| **Modern UI & Controls** | Fluent UI modern controls (Data Grid, Buttons, Dropdowns), CSS Grid Container layout control, and standardized modern app theming. | Native responsive layouts without complex formula nesting; consistent modern look across Web/Mobile. |
| **Mobile & Offline Resilience** | Native real-time Dataverse access in Canvas apps, FetchXML offline profile configuration, and push notifications for custom white-labeled apps. | Field apps stay functional and sync cleanly when connectivity is lost. |
| **AI & Generative Pages** | App-based AI agents, closed-loop memory learning via Power Apps MCP, context-aware generative pages, and in-app row summaries. | Users interact with app data using natural language and AI agents embedded directly inside forms and grids. |
| **Pro-Dev & Enterprise Scale** | Integrated Git source control, enhanced Monitor/debugging tools in Power Apps Studio, and PCF control extensions. | Simplifies multi-developer collaboration, code versioning, and enterprise governance. |
"""

parsed = AIService.analyze_roadmap_text(powerapps_text)
print(f"Roadmap Title: {parsed['title']}")
print(f"Total Modules Extracted: {len(parsed['modules'])}\n")
for idx, m in enumerate(parsed['modules']):
    print(f"Module {idx+1}: {m['title']} ({len(m['topics'])} topics)")
    for t in m['topics']:
        print(f"  - Topic: {t['title']} (Subtopics: {t['subtopics']})")
