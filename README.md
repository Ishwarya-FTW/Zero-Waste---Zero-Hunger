## 🌟 Core Breakthrough & Philosophy
> **"Fit to Eat → Feed People | Waste → Generate Energy"**

Every year, millions of tonnes of edible surplus food from Indian banquet halls, college hostels, corporate cafeterias, and wedding ceremonies are discarded into unsegregated municipal landfills, decomposing into fugitive methane ($CH_4$)—a greenhouse gas 28× more damaging than $CO_2$. Simultaneously, vulnerable populations face chronic malnutrition.

Current food rescue apps suffer from a fatal flaw: **when food remains uncollected or spoils past the safe consumption window, it is simply dumped into the trash.**

**Our Solution:** An autonomous dual-stream platform.
1. **Stream 1 (Zero Hunger):** Edible food is evaluated by a machine-learning Spoilage & Risk Prediction engine and matched via Google Maps Distance Matrix to nearby NGO volunteer fleets (Robin Hood Army, Feeding India) with automated SMS and automated IVR phone alerts.
2. **Stream 2 (Zero Waste - Failsafe):** If food remains uncollected as the safe window expires or is flagged unfit for human consumption, an automated cron service reroutes the batch to the nearest municipal Anaerobic Biomethanation Plant or Organic Fertilizer Factory (GOBARdhan network). Unavoidable waste is immediately converted into clean biomethane cooking fuel, electricity, and nitrogen-rich bio-slurry.

---

## 🚀 Key Features of the Web Application

- **Live Geospatial Dispatch Grid (Leaflet GIS):** Interactive visual tracking of food donors, volunteer couriers in transit, urgent expiry countdowns, and operational municipal biomethanizers across urban clusters.
- **Donor Station with ML Spoilage Predictor:** Dynamic computation of shelf-life based on meal moisture, ambient room temperature (31°C), cooking timestamp, and container insulation.
- **Dual-Stream Routing Simulator (Slide 3 Interactive Flow):** Step-by-step visual demonstration of both the *Zero Hunger* path and the *Zero Waste* failsafe branch.
- **Multi-Channel Dispatch Emulator:** Realistic preview of automated IVR voice broadcasts and SMS messages in English, Hindi, and Tamil (simulating Twilio / Exotel gateway).
- **Biogas & GOBARdhan Telemetry Panel:** Live monitoring of municipal digestion plants (Pallavaram, Saahas Guindy, IIMB Campus, Coimbatore Bio-CNG) with metrics on methane purity ($CH_4\%$), LPG cylinder offsets, and bio-fertilizer output.
- **Scientific ESG & Swachh Bharat Impact Modeler:** Interactive slider calculating meals served, cubic meters of biogas generated, and kilograms of greenhouse gases avoided based on CSIR-IICT conversion constants.
- **Full SIH 2025 Dossier & Citations:** Live integration of all presentation citations (Slide 6) including CGI India, Saahas, Hand in Hand India Pallavaram, IIM Bangalore, CSIR-IICT, and the Ministry of Jal Shakti's GOBARdhan portal.

---

## 🛠️ Technical Stack (Slide 3 Architecture)

| Component | Technology | Role |
|---|---|---|
| **Frontend Web Portal** | HTML5, Tailwind CSS, Leaflet.js, JetBrains Mono & Plus Jakarta Sans | High-utility CivicTech enterprise portal |
| **Donor & Courier Mobile** | Flutter / React Native | Field reporting, photos, GPS ping |
| **Backend & API Layer** | Node.js / Express REST API | Validation, state transitions, session handling |
| **Database & GIS** | PostgreSQL + PostGIS | Geospatial bounding box queries, donor/plant registry |
| **Matching & Routing Engine** | Google Maps Distance API + ML Spoilage Model | Distance decay scoring & microbial shelf-life index |
| **Alert Gateway** | Twilio / Exotel Voice API + SMS Gateway + Firebase FCM | Multilingual voice calls & automated dispatch SMS |
| **Govt & Biogas Interface** | GOBARdhan API & Composting Partner API | Digester feedstock scheduling & energy accounting |

---

## 🧪 How to Open & Run Locally

1. Simply double-click `index.html` to open it in any modern web browser (Chrome, Edge, Firefox, Safari).
2. Alternatively, run a lightweight local static server using Python or Node:
   ```bash
   # Using Python 3
   python -m http.server 8080
   # Then open: http://localhost:8080
   ```
   Or using PowerShell:
   ```powershell
   Start-Process index.html
   ```

---

## 📜 References & Research Sources
- **CGI India:** [Offsetting carbon emissions through biogas plants](https://www.cgi.com/india/en/article/esg/cgi-supports-offsetting-carbon-emissions-through-biogas)
- **Saahas:** Decentralized Biomethanization in Urban Tech Corridors
- **Hand in Hand India:** [Waste to Energy Pallavaram Plant](https://hihindia.org/impact/stories/waste-to-energy)
- **IIM Bangalore:** [Biogas Plant Commissions Waste into Wealth](https://www.iimb.ac.in/node/4813)
- **CSIR-IICT:** [Waste-to-Wealth Technology Compendium](https://www.csir.res.in/en/csir-science-stories/csir-iicts-waste-wealth-technology-wins-pms-praise)
- **Govt. of India - GOBARdhan:** [National Unified Portal](https://gobardhan.sbm.gov.in/plants-list)
