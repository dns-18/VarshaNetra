Act as an experienced Smart India Hackathon (SIH) winner, SIH evaluator, senior frontend architect, UI/UX designer, disaster-management product designer, and technical mentor.

I am participating in SIH 2026 with the following problem statement:

Problem Statement ID: 26001

Title:
AI-Based Early Warning and Landslide Risk Monitoring System in NER

Organization:
Ministry of Development of North Eastern Region (MDoNER)

Theme:
Disaster Management

PROBLEM:

The North Eastern Region of India frequently faces landslides, flash floods, road blockages and slope failures due to heavy rainfall, fragile terrain and unplanned hill cutting.

The proposed platform should:

1. Collect and analyse:
   - Rainfall patterns
   - Soil moisture sensor data
   - Satellite imagery
   - Terrain/slope data
   - Historical landslide records

2. Use AI/ML to:
   - Identify high-risk zones
   - Predict possible landslide events
   - Generate risk scores

3. Provide real-time alerts to:
   - District administrations
   - Disaster management authorities
   - Local communities

4. Integrate GIS:
   - Vulnerable zones
   - Roads
   - Villages
   - Infrastructure
   - Landslide locations

5. Allow citizens/field officers to:
   - Upload geo-tagged photos
   - Upload videos
   - Report cracks
   - Report slope movement
   - Report blocked roads

6. Provide dashboards for:
   - Risk severity
   - Road connectivity
   - Weather-linked risk forecasts
   - Emergency response prioritisation

7. Support:
   - Multilingual notifications
   - Low-network operation
   - Offline field reporting
   - Sync when connectivity returns

Expected platform:

- Real-time GIS dashboard
- Risk heatmaps
- AI/ML prediction engine
- Mobile/web application
- Field reporting
- IMD/weather integration
- Satellite/sensor integration
- SMS/app alerts
- Cloud architecture
- Offline sync

PROJECT NAME:

VARSHANETRA

Working expansion:

Predictive AI for Risk, Vulnerability Assessment & Terrain Monitoring

Tagline:

"Observe. Predict. Warn. Protect."

IMPORTANT:

I am primarily responsible for the FRONTEND.

My stack is:

- React
- TypeScript
- Vite
- Tailwind CSS
- JavaScript/TypeScript
- React Router
- Lucide React icons
- Leaflet/React-Leaflet or another suitable GIS library
- Recharts or another suitable chart library

I want to understand the complete project instead of blindly generating code.

==================================================
MY MOST IMPORTANT REQUIREMENT
==================================================

DO NOT BUILD THE ENTIRE PROJECT AT ONCE.

DO NOT GIVE ME 500-1000 LINES OF CODE.

DO NOT create every component in one response.

DO NOT hide complexity behind generated abstractions that I cannot explain.

We will build this project STEP BY STEP.

For every step:

1. Explain what we are building.
2. Explain WHY it is needed.
3. Explain how it connects to the SIH problem statement.
4. Explain the UI/UX decision.
5. Explain the React concepts involved.
6. Explain the data flow.
7. Give me ONLY the code required for that step.
8. Tell me exactly which file to create/edit.
9. Tell me exactly where each piece of code goes.
10. Make me run/test it.
11. Explain the code line-by-line or section-by-section.
12. Ask me to verify the result before moving forward.

Never assume I understand a library just because the code uses it.

If you introduce:
- React hooks
- props
- state
- context
- routing
- TypeScript interfaces
- API calls
- map libraries
- chart libraries
- WebSockets
- localStorage
- IndexedDB
- service workers
- animations

explain the concept briefly before using it.

==================================================
SIH EVALUATOR-FIRST APPROACH
==================================================

Think like an SIH evaluator.

The project will NOT win because it has a beautiful dashboard alone.

The evaluator should be able to see:

PROBLEM
↓
DATA
↓
AI ANALYSIS
↓
RISK PREDICTION
↓
EARLY WARNING
↓
FIELD VERIFICATION
↓
RESPONSE PRIORITISATION
↓
ACTION

Our frontend must make this complete story visible.

Every major UI component should answer at least one question:

1. WHERE is the danger?
2. HOW severe is it?
3. WHY is it dangerous?
4. WHEN could it become dangerous?
5. WHO/WHAT is affected?
6. WHAT action should authorities take?
7. HAS someone responded?
8. WHAT evidence supports the prediction?

==================================================
DO NOT MAKE A GENERIC DASHBOARD
==================================================

I explicitly DO NOT want:

- Generic SaaS dashboard
- Generic admin panel
- Cryptocurrency-style dashboard
- Banking dashboard
- Excessive glassmorphism
- Random gradients
- Purple AI glow everywhere
- Excessive rounded cards
- Huge meaningless statistics
- Emoji as primary icons
- Decorative animations
- Dribbble-style design that sacrifices usability

The UI must feel like:

"An operational disaster intelligence command center."

Visual inspiration can come conceptually from:

- Emergency Operations Centers
- GIS command systems
- Mission-control interfaces
- Geospatial intelligence systems
- Modern government technology
- Real-time monitoring systems

But DO NOT copy an existing product.

Create an original visual identity for VARSHANETRA.

==================================================
UNIQUE UI DIRECTION
==================================================

Design VARSHANETRA around a concept called:

"Terrain Intelligence Command Center"

The GIS map should be the visual heart of the application.

Instead of making the map just another card, build the interface around the relationship:

MAP
+
RISK
+
EVIDENCE
+
PREDICTION
+
RESPONSE

The user should be able to select a region on the map and immediately understand:

Location
Risk score
Risk level
Prediction confidence
Rainfall
Soil moisture
Slope
Historical incidents
Nearby roads
Nearby villages
Nearby critical infrastructure
Recommended action

==================================================
SIGNATURE FEATURES
==================================================

Create unique but technically realistic frontend features.

FEATURE 1 — RISK PULSE

A live risk score:

87 / 100
CRITICAL

Show:

- Current risk
- Risk trend
- Prediction confidence
- Forecast window
- Risk history

The score should visually transition when simulated data changes.

Example:

42
↓
51
↓
64
↓
78
↓
87

This will demonstrate that the dashboard is reacting to changing conditions.

-----------------------------------------------

FEATURE 2 — WHY THIS AREA IS AT RISK

Do not simply show:

"AI prediction: 87"

Instead show explainable risk factors.

Example:

Rainfall          32%
Soil Moisture     25%
Slope             18%
Historical Risk   12%
Terrain            8%
Other              5%

Then show:

"Risk increased primarily because rainfall accumulation and soil saturation crossed critical thresholds."

This makes the AI understandable to an evaluator.

-----------------------------------------------

FEATURE 3 — DISASTER SIMULATION MODE

Create a demo mode for the internal hackathon.

Button:

START SCENARIO

When activated:

Rainfall increases
↓
Soil moisture increases
↓
Risk score increases
↓
Risk zone changes color
↓
Warning is generated
↓
Affected roads appear
↓
Affected villages appear
↓
Response priority changes

Example:

NORMAL
→ WATCH
→ HIGH
→ CRITICAL

This is extremely important for the working prototype.

The evaluator should be able to SEE the system respond.

-----------------------------------------------

FEATURE 4 — INCIDENT TIMELINE

Create:

LIVE INCIDENT TIMELINE

Example:

14:02
Heavy rainfall detected

14:07
Soil moisture threshold crossed

14:11
Risk increased to 68

14:16
Area classified HIGH

14:19
Field report received

14:21
Critical warning generated

14:23
Response team dispatched

This should make the system feel operational.

-----------------------------------------------

FEATURE 5 — AI DECISION TRACE

Create a panel showing:

INPUT
↓
ANALYSIS
↓
RISK
↓
RECOMMENDATION

Example:

Rainfall
78 mm/hr

+

Soil Moisture
84%

+

Slope
37°

+

Historical Risk
HIGH

↓

AI RISK ENGINE

↓

87 / 100

CRITICAL

↓

RECOMMENDED ACTION

Inspect NH-10
Alert nearby villages
Prepare response team

This should be one of the most impressive parts of the demo.

-----------------------------------------------

FEATURE 6 — RESPONSE PRIORITY QUEUE

Instead of simply showing incidents, rank them.

Example:

#1 NH-10 Road Blockage
Priority 94

#2 Village Risk
Priority 89

#3 Slope Movement
Priority 82

Show why each incident received its priority.

-----------------------------------------------

FEATURE 7 — FIELD OFFICER MODE

Create a separate mobile-first experience.

Large actions:

REPORT LANDSLIDE
REPORT CRACK
REPORT SLOPE MOVEMENT
REPORT ROAD BLOCKAGE

Allow:

Photo
GPS
Severity
Description

Show:

ONLINE

or

OFFLINE — 3 REPORTS QUEUED

When connection returns:

SYNCING...
↓
3 REPORTS SYNCHRONIZED

The frontend should demonstrate the offline-first concept even if the actual backend sync is implemented later.

-----------------------------------------------

FEATURE 8 — RISK REPLAY

Create a timeline slider that allows the evaluator to replay how risk evolved.

Example:

08:00 → 42
10:00 → 51
12:00 → 64
14:00 → 78
16:00 → 87

When the slider moves:

- Risk score changes
- Map risk changes
- Risk drivers change
- Timeline updates

This can be a powerful demo feature.

-----------------------------------------------

FEATURE 9 — EVIDENCE PANEL

When a risk zone is selected, show the evidence behind the prediction:

Satellite observation
Rainfall
Sensor readings
Terrain
Historical events
Field reports

The objective is to avoid making the AI prediction feel arbitrary.

==================================================
VISUAL DESIGN
==================================================

Create a distinctive professional visual system.

Possible direction:

Dark command-center interface.

Use:

- Deep neutral background
- High readability
- Subtle borders
- Restrained shadows
- Strong typography
- Semantic risk colors

Risk colors must have meaning:

LOW → green
MODERATE → yellow
HIGH → orange
CRITICAL → red

Do not use risk colors as decoration.

Use them only when communicating system state.

Typography must be highly readable.

Accessibility and contrast are important.

==================================================
APPLICATION STRUCTURE
==================================================

Build the application gradually.

Suggested structure:

src/
│
├── components/
│   ├── layout/
│   ├── map/
│   ├── risk/
│   ├── alerts/
│   ├── incidents/
│   ├── weather/
│   ├── sensors/
│   ├── response/
│   └── common/
│
├── pages/
│   ├── Dashboard/
│   ├── RiskMap/
│   ├── Alerts/
│   ├── Incidents/
│   ├── Response/
│   ├── Analytics/
│   └── FieldOfficer/
│
├── data/
├── hooks/
├── services/
├── types/
└── utils/

Do not create all these files immediately.

Create them only when required.

==================================================
DATA STRATEGY
==================================================

Initially use realistic mock data.

But structure the code so that later:

MOCK DATA
↓
API
↓
REAL SENSOR/WEATHER/AI DATA

can be substituted without rewriting the entire UI.

Create TypeScript interfaces for important data models.

Examples:

RiskZone
Sensor
WeatherData
Incident
Road
Village
Alert
ResponseTeam
RiskFactor

Explain each interface.

==================================================
AI/ML FRONTEND INTEGRATION
==================================================

Initially we can simulate AI results.

Do NOT pretend that a frontend mock is a real AI model.

Clearly separate:

DEMO DATA

from:

REAL AI/API DATA

The frontend should be designed so the backend team can later provide:

riskScore
confidence
riskLevel
riskFactors
predictionWindow
recommendedActions

The frontend should consume these values.

==================================================
GIS
==================================================

Use a suitable React-compatible GIS library.

Prefer Leaflet/React-Leaflet if appropriate for the prototype.

Do not start by building an overly complicated GIS system.

First build:

1. Base map
2. Markers
3. Risk zones
4. Map legend
5. Layer controls
6. Selected location panel

Then gradually add advanced functionality.

==================================================
RESPONSIVENESS
==================================================

Desktop:

Command-center layout.

Mobile:

Field officer layout.

Do NOT simply shrink the desktop UI.

Mobile should prioritize:

1. Current risk
2. Active warning
3. Report incident
4. GPS
5. Road status

==================================================
DEVELOPMENT RULE
==================================================

We will follow this sequence:

PHASE 0
Understand existing project

PHASE 1
Design system

PHASE 2
Application shell

PHASE 3
Navigation/sidebar

PHASE 4
Top system status bar

PHASE 5
Dashboard structure

PHASE 6
GIS map

PHASE 7
Risk Pulse

PHASE 8
Risk Drivers

PHASE 9
AI Decision Trace

PHASE 10
Weather + Sensor monitoring

PHASE 11
Early Warning system

PHASE 12
Incident Timeline

PHASE 13
Response Priority Queue

PHASE 14
Field Officer interface

PHASE 15
Offline simulation

PHASE 16
Disaster Simulation Mode

PHASE 17
Risk Replay

PHASE 18
Backend/API integration preparation

PHASE 19
Responsive/mobile optimization

PHASE 20
Accessibility + UX polish

PHASE 21
Demo preparation

Do not jump ahead.

==================================================
HOW YOU SHOULD TEACH ME
==================================================

For each phase respond using this format:

# PHASE X — [NAME]

## 1. What are we building?

Simple explanation.

## 2. Why does SIH need this?

Connect it to the problem statement.

## 3. What will the evaluator see?

Explain the visible result.

## 4. React concepts involved

List concepts I need to understand.

## 5. Files involved

Tell me exactly:

CREATE:
...

EDIT:
...

DO NOT TOUCH:
...

## 6. Implementation

Give only the code needed for THIS phase.

Do not generate future components.

## 7. Explanation

Explain the important code section-by-section.

## 8. How to run

Give exact commands.

## 9. Testing checklist

Tell me exactly what I should click/check.

## 10. SIH presentation explanation

Give me 3-5 sentences that I can use to explain this component to an evaluator.

## 11. What comes next?

Tell me the next phase, but DO NOT implement it yet.

==================================================
CODE QUALITY RULES
==================================================

Use:

- clean React components
- TypeScript
- reusable components
- meaningful names
- proper props
- semantic HTML
- accessible controls
- responsive layouts
- maintainable folder structure

Avoid:

- giant components
- duplicate code
- unexplained magic numbers
- unnecessary dependencies
- unnecessary state
- fake complexity
- over-engineering

Do not modify unrelated working code.

Before changing an existing file, inspect its current content and explain what you are changing.

==================================================
SIH DEMO STRATEGY
==================================================

Eventually our 3-5 minute demo should follow:

1. Open PARVAT Command Center

2. Show current regional risk

3. Select a high-risk zone

4. Show:
   - risk score
   - confidence
   - rainfall
   - soil moisture
   - slope
   - historical data

5. Click:

START SCENARIO

6. Show rainfall increasing

7. Show risk score increasing

8. Show map zone changing

9. Show AI Decision Trace

10. Automatically generate early warning

11. Show affected road/village

12. Show Response Priority Queue

13. Open Field Officer Mode

14. Submit a simulated field report

15. Show it appearing on the command center

16. Demonstrate offline queue

17. Synchronize when online

The entire demo should tell one continuous story.

==================================================
MOST IMPORTANT RULE
==================================================

I am learning while building.

Never optimize only for speed.

Optimize for:

UNDERSTANDING
+
WORKING PROTOTYPE
+
EXPLAINABILITY
+
DEMO IMPACT
+
MAINTAINABILITY

If a feature is impressive but impossible for me to explain during an SIH evaluation, simplify it.

If a feature can make the prototype significantly more convincing while remaining technically realistic, suggest it.

Always distinguish:

REAL IMPLEMENTATION
from
DEMO SIMULATION.

Do not claim functionality that has not actually been implemented.

==================================================

START NOW
==================================================

Do NOT write code yet.

Start with PHASE 0.

First inspect my existing frontend project structure and tell me:

1. What framework/version I am using
2. Current folder structure
3. Existing dependencies
4. Existing components
5. Existing pages
6. Existing styling system
7. What can be reused
8. What should be changed
9. What should NOT be changed
10. Recommended implementation roadmap

Then stop and wait for my confirmation.