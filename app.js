(function () {
  'use strict';

  // Global State Store
  const state = {
    donations: [...window.SIH_DATA.INITIAL_DONATIONS],
    biogasPlants: [...window.SIH_DATA.BIOGAS_PLANTS],
    ngos: [...window.SIH_DATA.NGO_FLEETS],
    activeTab: 'dispatch-map',
    map: null,
    mapMarkers: [],
    currentFilter: 'all',
    simulationStep: 0,
    isSimulating: false,
    selectedDonationForModal: null,
    phonePreviewMode: 'sms', // 'sms' or 'voice'
    phoneLanguage: 'en', // 'en', 'hi', 'ta'
  };

  // DOM Elements
  const elements = {
    tabs: document.querySelectorAll('.nav-tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    activeDonationCount: document.getElementById('statActiveDonations'),
    mealsServedCount: document.getElementById('statMealsServed'),
    biogasGeneratedCount: document.getElementById('statBiogasGenerated'),
    co2AvoidedCount: document.getElementById('statCo2Avoided'),
    donationListContainer: document.getElementById('donationListContainer'),
    donorForm: document.getElementById('surplusPostForm'),
    spoilageGaugeHours: document.getElementById('spoilageGaugeHours'),
    spoilageRiskBadge: document.getElementById('spoilageRiskBadge'),
    spoilageAdviceText: document.getElementById('spoilageAdviceText'),
    calcSlider: document.getElementById('calcKgSlider'),
    calcKgDisplay: document.getElementById('calcKgDisplay'),
    calcMeals: document.getElementById('calcMeals'),
    calcBiogas: document.getElementById('calcBiogas'),
    calcLpg: document.getElementById('calcLpg'),
    calcCo2: document.getElementById('calcCo2'),
    calcCompost: document.getElementById('calcCompost'),
    toast: document.getElementById('toastNotification'),
    toastTitle: document.getElementById('toastTitle'),
    toastMessage: document.getElementById('toastMessage'),
    phoneModal: document.getElementById('phoneSimulatorModal'),
  };

  // Initialize Application
  function init() {
    setupTabNavigation();
    setupLeafletMap();
    renderDonationsList();
    renderBiogasPlants();
    setupDonorFormListeners();
    setupImpactCalculator();
    setupSimulatorControls();
    updateGlobalMetrics();
    setInterval(updateCountdowns, 30000); // refresh every 30s
  }

  // --- TAB NAVIGATION ---
  function setupTabNavigation() {
    elements.tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = tab.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    elements.tabs.forEach(tab => {
      if (tab.getAttribute('data-tab') === tabId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    elements.tabPanes.forEach(pane => {
      if (pane.id === tabId) {
        pane.classList.remove('hidden');
      } else {
        pane.classList.add('hidden');
      }
    });

    if (tabId === 'dispatch-map' && state.map) {
      setTimeout(() => {
        state.map.invalidateSize();
      }, 100);
    }
  }
  window.switchTab = switchTab;

  // --- LEAFLET MAP & GIS DISPATCH ---
  function setupLeafletMap() {
    const mapElement = document.getElementById('dispatchMap');
    if (!mapElement) return;

    // Centered on Chennai & environs (primary pilot hub)
    state.map = L.map('dispatchMap', {
      zoomControl: true,
      scrollWheelZoom: false
    }).setView([13.0100, 80.2000], 11);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> | Swachh Bharat & SIH 2025 GIS',
      maxZoom: 19
    }).addTo(state.map);

    refreshMapMarkers();

    // Map filters
    document.querySelectorAll('.map-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.map-filter-btn').forEach(b => {
          b.classList.remove('bg-emerald-800', 'text-white');
          b.classList.add('bg-white', 'text-slate-700');
        });
        btn.classList.remove('bg-white', 'text-slate-700');
        btn.classList.add('bg-emerald-800', 'text-white');

        state.currentFilter = btn.getAttribute('data-filter');
        refreshMapMarkers();
      });
    });
  }

  function refreshMapMarkers() {
    if (!state.map) return;

    // Clear existing markers
    state.mapMarkers.forEach(m => state.map.removeLayer(m));
    state.mapMarkers = [];

    // Add Donors
    state.donations.forEach(don => {
      if (state.currentFilter === 'hunger' && don.status === 'REROUTED_BIOGAS') return;
      if (state.currentFilter === 'biogas' && don.status !== 'REROUTED_BIOGAS') return;
      if (state.currentFilter === 'urgent' && don.status !== 'URGENT_PENDING') return;

      let pinClass = 'pin-urgent';
      let iconSymbol = '🍲';

      if (don.status === 'REROUTED_BIOGAS') {
        pinClass = 'pin-expired';
        iconSymbol = '⚡';
      } else if (don.status === 'IN_TRANSIT_NGO' || don.status === 'MATCHED_NGO') {
        pinClass = 'pin-transit';
        iconSymbol = '🚚';
      }

      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="custom-map-pin ${pinClass}" style="width: 34px; height: 34px;">${iconSymbol}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const marker = L.marker(don.coordinates, { icon: customIcon }).addTo(state.map);
      marker.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 220px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 2px;">
            ${don.id} &bull; ${don.donorType}
          </div>
          <h4 style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
            ${don.donorName}
          </h4>
          <p style="font-size: 0.82rem; color: #334155; margin-bottom: 6px;">
            <strong>${don.foodItems}</strong><br>
            Quantity: <strong>${don.quantityServings} servings (${don.quantityKg} kg)</strong>
          </p>
          <div style="font-size: 0.75rem; margin-bottom: 8px;">
            Safe Window: <strong>${don.safeWindowHours > 0 ? don.safeWindowHours + ' hrs remaining' : '<span style="color:#ea580c">Expired (Routing to Biogas)</span>'}</strong>
          </div>
          <div style="display: flex; gap: 6px;">
            <button onclick="window.triggerSimulatePickup('${don.id}')" 
              style="background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.72rem; cursor: pointer; font-weight: 600;">
              ${don.status === 'REROUTED_BIOGAS' ? 'View Digester Status' : 'Simulate NGO Match'}
            </button>
            <button onclick="window.openPhonePreview('${don.id}')" 
              style="background: #334155; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.72rem; cursor: pointer; font-weight: 600;">
              IVR / SMS Log
            </button>
          </div>
        </div>
      `);
      state.mapMarkers.push(marker);
    });

    // Add Biogas Plants
    if (state.currentFilter === 'all' || state.currentFilter === 'biogas') {
      state.biogasPlants.forEach(plant => {
        const bioIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="custom-map-pin pin-biogas" style="width: 36px; height: 36px;">♻️</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const marker = L.marker(plant.coordinates, { icon: bioIcon }).addTo(state.map);
        marker.bindPopup(`
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 230px;">
            <div style="font-size: 0.72rem; font-weight: 700; color: #166534; text-transform: uppercase;">
              ${plant.schemeLink}
            </div>
            <h4 style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
              ${plant.name}
            </h4>
            <p style="font-size: 0.8rem; color: #475569; margin-bottom: 6px;">
              Partner: <strong>${plant.partner}</strong><br>
              Capacity: <strong>${plant.capacityKgPerDay} kg/day</strong> | Current: <strong>${plant.currentLoadKg} kg</strong>
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 6px; border-radius: 4px; font-size: 0.75rem; color: #14532d; margin-bottom: 6px;">
              ⚡ Methane Purity: <strong>${plant.methanePurity}</strong><br>
              🔥 Daily LPG Equivalent: <strong>${plant.lpgCylinderEquivalent} Cylinders</strong>
            </div>
          </div>
        `);
        state.mapMarkers.push(marker);
      });
    }
  }

  // --- RENDER LIVE RESCUE LIST ---
  function renderDonationsList() {
    if (!elements.donationListContainer) return;
    elements.donationListContainer.innerHTML = '';

    state.donations.forEach(don => {
      const card = document.createElement('div');
      card.className = 'bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow transition-all relative';
      
      let badgeHtml = '';
      let actionButtons = '';

      if (don.status === 'URGENT_PENDING') {
        badgeHtml = `<span class="badge-status badge-amber"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span> Urgent Matching (${don.safeWindowHours}h left)</span>`;
        actionButtons = `
          <button onclick="window.triggerSimulatePickup('${don.id}')" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-sm transition">
            ✓ Match NGO Volunteer
          </button>
          <button onclick="window.triggerForceBiogas('${don.id}')" class="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold shadow-sm transition">
            ⚡ Force Biogas Reroute
          </button>
          <button onclick="window.openPhonePreview('${don.id}')" class="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium border border-slate-300 transition">
            📱 Preview IVR / SMS
          </button>
        `;
      } else if (don.status === 'IN_TRANSIT_NGO' || don.status === 'MATCHED_NGO') {
        badgeHtml = `<span class="badge-status badge-blue"><span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Zero Hunger Transit</span>`;
        actionButtons = `
          <div class="text-xs text-slate-600">
            Assigned: <strong class="text-slate-800">${don.assignedPartner}</strong> (${don.volunteerName || 'Fleet Lead'})
          </div>
          <div class="flex items-center gap-2 mt-2">
            <button onclick="window.completeDelivery('${don.id}')" class="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold shadow-sm transition">
              Mark Distributed to Shelter
            </button>
            <button onclick="window.openPhonePreview('${don.id}')" class="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium border border-slate-300 transition">
              Dispatch Logs
            </button>
          </div>
        `;
      } else if (don.status === 'REROUTED_BIOGAS') {
        badgeHtml = `<span class="badge-status badge-rust"><span class="w-1.5 h-1.5 rounded-full bg-orange-600"></span> Zero Waste (Biogas Digester)</span>`;
        actionButtons = `
          <div class="text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded p-2 mb-2">
            Safe food window elapsed &bull; Auto-rerouted to <strong>${don.assignedPartner}</strong> for anaerobic biomethanation.
          </div>
          <button onclick="window.switchTab('biogas-telemetry')" class="px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-xs font-semibold shadow-sm transition">
            View Plant Biogas Output →
          </button>
        `;
      } else if (don.status === 'COMPLETED_HUNGER') {
        badgeHtml = `<span class="badge-status badge-green">✓ Distributed (Zero Hunger)</span>`;
        actionButtons = `
          <div class="text-xs text-emerald-700 font-medium">
            Delivered to Orphanage & Old Age Shelter &bull; ${don.quantityServings} individuals nourished safely.
          </div>
        `;
      }

      card.innerHTML = `
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <span class="text-[0.7rem] font-bold text-slate-400 mono-tag">${don.id} &bull; ${don.city}</span>
            <h4 class="text-sm font-bold text-slate-900 mt-0.5">${don.donorName}</h4>
          </div>
          <div>${badgeHtml}</div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded border border-slate-100 mb-3">
          <div>
            <span class="text-slate-500">Food Items:</span>
            <p class="font-semibold text-slate-800 truncate" title="${don.foodItems}">${don.foodItems}</p>
          </div>
          <div>
            <span class="text-slate-500">Quantity / Mass:</span>
            <p class="font-semibold text-slate-800">${don.quantityServings} servings <span class="text-slate-500">(${don.quantityKg} kg)</span></p>
          </div>
          <div>
            <span class="text-slate-500">Prepared Time:</span>
            <p class="font-medium text-slate-700">${don.preparedAtTime} (${don.ambientTempC}°C ambient)</p>
          </div>
          <div>
            <span class="text-slate-500">Microbial Risk:</span>
            <p class="font-medium ${don.riskScore === 'CRITICAL_EXPIRED' ? 'text-red-600 font-bold' : don.riskScore === 'HIGH' ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}">${don.riskScore}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          ${actionButtons}
        </div>
      `;

      elements.donationListContainer.appendChild(card);
    });
  }

  // --- ACTIONS & SIMULATION TRIGGERS ---
  window.triggerSimulatePickup = function (id) {
    const don = state.donations.find(d => d.id === id);
    if (!don) return;

    if (don.status === 'REROUTED_BIOGAS') {
      switchTab('biogas-telemetry');
      return;
    }

    // Assign NGO
    const randomNgo = state.ngos[Math.floor(Math.random() * state.ngos.length)];
    don.status = 'IN_TRANSIT_NGO';
    don.assignedPartner = randomNgo.name;
    don.volunteerName = 'Ramesh Kumar (Fleet #3)';
    don.logs.push({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Matched with ${randomNgo.name}. Automated IVR call confirmed volunteer driver dispatch.`
    });

    showToast('NGO Volunteer Dispatched', `Food batch ${don.id} assigned to ${randomNgo.name}. Transit underway.`);
    renderDonationsList();
    refreshMapMarkers();
    updateGlobalMetrics();
  };

  window.triggerForceBiogas = function (id) {
    const don = state.donations.find(d => d.id === id);
    if (!don) return;

    don.status = 'REROUTED_BIOGAS';
    don.safeWindowHours = 0;
    don.riskScore = 'CRITICAL_EXPIRED';
    don.assignedPartner = 'Pallavaram Municipal Biomethanation Plant';
    don.logs.push({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: 'Human consumption threshold elapsed. Fail-safe auto-routed to Pallavaram Biogas Digester #2.'
    });

    // Update plant feedstock load
    state.biogasPlants[0].currentLoadKg += don.quantityKg;

    showToast('Auto-Rerouted to Biogas (Zero Waste)', `${don.quantityKg} kg organic material redirected to Pallavaram Biomethanation Plant to generate methane.`);
    renderDonationsList();
    refreshMapMarkers();
    renderBiogasPlants();
    updateGlobalMetrics();
  };

  window.completeDelivery = function (id) {
    const don = state.donations.find(d => d.id === id);
    if (!don) return;

    don.status = 'COMPLETED_HUNGER';
    don.logs.push({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: 'Safe food successfully handed over to local orphanage and community dining center.'
    });

    showToast('Food Safely Delivered!', `${don.quantityServings} meals delivered safely to beneficiaries.`);
    renderDonationsList();
    refreshMapMarkers();
    updateGlobalMetrics();
  };

  // --- DONOR FORM & LIVE ML SPOILAGE PREDICTION ---
  function setupDonorFormListeners() {
    if (!elements.donorForm) return;

    const foodTypeSelect = document.getElementById('postFoodType');
    const prepTimeInput = document.getElementById('postPrepTime');
    const storageSelect = document.getElementById('postStorage');

    const updatePredictor = () => {
      const foodType = foodTypeSelect ? foodTypeSelect.value : 'rice_curry';
      const hoursAgo = prepTimeInput ? parseFloat(prepTimeInput.value) || 1 : 1;
      const storage = storageSelect ? storageSelect.value : 'ambient';

      // Base safe hours by category
      let baseSafeHours = 4.5;
      if (foodType === 'breads_dry') baseSafeHours = 7.0;
      if (foodType === 'sweets_dairy') baseSafeHours = 3.0;
      if (foodType === 'raw_produce') baseSafeHours = 12.0;

      // Storage modifier
      if (storage === 'insulated_warmer') baseSafeHours += 1.5;
      if (storage === 'refrigerated') baseSafeHours += 10.0;
      if (storage === 'uncovered_ambient') baseSafeHours -= 1.0;

      const remainingHours = Math.max(0, parseFloat((baseSafeHours - hoursAgo).toFixed(1)));

      if (elements.spoilageGaugeHours) {
        elements.spoilageGaugeHours.textContent = remainingHours > 0 ? `${remainingHours} hrs` : '0.0 hrs (Expired)';
      }

      if (elements.spoilageRiskBadge) {
        if (remainingHours <= 0) {
          elements.spoilageRiskBadge.className = 'badge-status badge-rust';
          elements.spoilageRiskBadge.textContent = 'UNSAFE FOR EATING → BIOGAS DIGESTER';
          if (elements.spoilageAdviceText) {
            elements.spoilageAdviceText.textContent = '⚠️ Food safety limit exceeded. CleverCast Smart Engine will immediately route this batch to anaerobic digestion for clean energy.';
          }
        } else if (remainingHours < 1.5) {
          elements.spoilageRiskBadge.className = 'badge-status badge-amber';
          elements.spoilageRiskBadge.textContent = 'HIGH SPOILAGE RISK (EXPEDITED PICKUP)';
          if (elements.spoilageAdviceText) {
            elements.spoilageAdviceText.textContent = '⚡ High urgency. Immediate IVR phone broadcast will trigger to all volunteer fleets within 3 km.';
          }
        } else {
          elements.spoilageRiskBadge.className = 'badge-status badge-green';
          elements.spoilageRiskBadge.textContent = 'FRESH & SAFE (ZERO HUNGER QUALIFIED)';
          if (elements.spoilageAdviceText) {
            elements.spoilageAdviceText.textContent = '✓ High quality edible surplus. Matched to nearby shelter homes, orphanages, and community kitchens.';
          }
        }
      }
    };

    if (foodTypeSelect) foodTypeSelect.addEventListener('change', updatePredictor);
    if (prepTimeInput) prepTimeInput.addEventListener('input', updatePredictor);
    if (storageSelect) storageSelect.addEventListener('change', updatePredictor);
    updatePredictor();

    elements.donorForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const donorName = document.getElementById('postDonorName').value;
      const donorType = document.getElementById('postDonorType').value;
      const foodItems = document.getElementById('postFoodItems').value;
      const servings = parseInt(document.getElementById('postServings').value) || 100;
      const kg = Math.round(servings * window.SIH_DATA.SCIENTIFIC_CONSTANTS.MEAL_KG_WEIGHT);
      const hoursAgo = parseFloat(document.getElementById('postPrepTime').value) || 1.5;
      const locationSelect = document.getElementById('postLocation').value;

      // Coordinate mapping based on selection
      let coords = [13.0418, 80.2341];
      let cityStr = 'Chennai (T. Nagar)';
      if (locationSelect === 'guindy') { coords = [13.0067, 80.2081]; cityStr = 'Chennai (Guindy)'; }
      if (locationSelect === 'vandalur') { coords = [12.8406, 80.1534]; cityStr = 'Chennai (Vandalur)'; }
      if (locationSelect === 'taramani') { coords = [12.9897, 80.2476]; cityStr = 'Chennai (Taramani)'; }
      if (locationSelect === 'pallavaram') { coords = [12.9675, 80.1491]; cityStr = 'Chennai (Pallavaram)'; }

      const remainingHours = parseFloat(elements.spoilageGaugeHours.textContent.split(' ')[0]) || 2.5;

      const newId = `DON-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const isExpired = remainingHours <= 0;

      const newDonation = {
        id: newId,
        donorName: donorName,
        donorType: donorType,
        city: cityStr,
        coordinates: coords,
        foodCategory: document.getElementById('postFoodType').options[document.getElementById('postFoodType').selectedIndex].text,
        foodItems: foodItems,
        quantityServings: servings,
        quantityKg: kg,
        preparedAtTime: `${hoursAgo} hours ago`,
        safeWindowHours: remainingHours,
        ambientTempC: 30,
        packaging: document.getElementById('postStorage').options[document.getElementById('postStorage').selectedIndex].text,
        status: isExpired ? 'REROUTED_BIOGAS' : 'URGENT_PENDING',
        assignedPartner: isExpired ? 'Pallavaram Municipal Biomethanation Plant' : null,
        riskScore: isExpired ? 'CRITICAL_EXPIRED' : remainingHours < 1.5 ? 'HIGH' : 'LOW',
        verificationStatus: 'Live Submission - Awaiting Partner Confirmation',
        logs: [
          { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text: `Surplus food posted by ${donorName}. Validation passed.` }
        ]
      };

      state.donations.unshift(newDonation);
      renderDonationsList();
      refreshMapMarkers();
      updateGlobalMetrics();

      showToast(
        isExpired ? 'Redirected to Biogas Plant' : 'Surplus Food Posted Successfully!',
        isExpired 
          ? `Batch marked unviable for human consumption; auto-diverted to Anaerobic Digestion.` 
          : `Automated notification queued for local NGO fleet in ${cityStr}.`
      );

      // Reset form
      elements.donorForm.reset();
      updatePredictor();
      switchTab('dispatch-map');
    });
  }

  // --- BIOGAS & GOBARDHAN RENDERING ---
  function renderBiogasPlants() {
    const container = document.getElementById('biogasPlantListContainer');
    if (!container) return;
    container.innerHTML = '';

    state.biogasPlants.forEach(plant => {
      const loadPct = Math.min(100, Math.round((plant.currentLoadKg / plant.capacityKgPerDay) * 100));

      const card = document.createElement('div');
      card.className = 'bg-white border border-slate-200 rounded-lg p-5 shadow-sm';
      card.innerHTML = `
        <div class="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <div class="text-[0.72rem] font-bold text-emerald-700 uppercase tracking-wide">
              ${plant.schemeLink} &bull; ${plant.techType}
            </div>
            <h3 class="text-base font-bold text-slate-900">${plant.name}</h3>
            <p class="text-xs text-slate-500">${plant.location} &bull; Partner: ${plant.partner}</p>
          </div>
          <span class="badge-status badge-green">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> ${plant.status}
          </span>
        </div>

        <div class="mb-4">
          <div class="flex justify-between text-xs mb-1">
            <span class="text-slate-600 font-medium">Daily Food-Waste Intake Capacity</span>
            <span class="font-bold text-slate-800">${plant.currentLoadKg.toLocaleString()} / ${plant.capacityKgPerDay.toLocaleString()} kg (${loadPct}%)</span>
          </div>
          <div class="clean-progress">
            <div class="clean-progress-bar ${loadPct > 80 ? 'bg-amber-500' : 'bg-emerald-600'}" style="width: ${loadPct}%"></div>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 rounded-lg p-3 border border-slate-100 text-center">
          <div class="p-1.5">
            <div class="text-xs text-slate-500">Methane Gas Purity</div>
            <div class="text-sm font-bold text-emerald-800 tabular-numbers">${plant.methanePurity}</div>
          </div>
          <div class="p-1.5">
            <div class="text-xs text-slate-500">Daily Gas Yield</div>
            <div class="text-sm font-bold text-slate-800 tabular-numbers">${plant.dailyGasOutputM3} m³</div>
          </div>
          <div class="p-1.5">
            <div class="text-xs text-slate-500">LPG Equivalence</div>
            <div class="text-sm font-bold text-amber-700 tabular-numbers">${plant.lpgCylinderEquivalent} Cylinders</div>
          </div>
          <div class="p-1.5">
            <div class="text-xs text-slate-500">Bio-Fertilizer / Manure</div>
            <div class="text-sm font-bold text-slate-800 tabular-numbers">${plant.compostProducedKg} kg</div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // --- DUAL STREAM STEP-BY-STEP SIMULATOR CONTROLS ---
  function setupSimulatorControls() {
    const btnSimHunger = document.getElementById('btnSimulateHungerStream');
    const btnSimWaste = document.getElementById('btnSimulateWasteStream');
    const btnResetSim = document.getElementById('btnResetSimulation');

    if (btnSimHunger) {
      btnSimHunger.addEventListener('click', () => runPipelineSimulation('hunger'));
    }
    if (btnSimWaste) {
      btnSimWaste.addEventListener('click', () => runPipelineSimulation('waste'));
    }
    if (btnResetSim) {
      btnResetSim.addEventListener('click', resetPipelineVisualizer);
    }
  }

  function runPipelineSimulation(branch) {
    if (state.isSimulating) return;
    state.isSimulating = true;
    resetPipelineVisualizer();

    const steps = [
      { id: 'sim-step-1', delay: 400 },
      { id: 'sim-step-2', delay: 1000 },
      { id: 'sim-step-3', delay: 1600 },
      { id: 'sim-step-4', delay: 2300 },
      { id: branch === 'hunger' ? 'sim-step-5a' : 'sim-step-5b', delay: 3200 },
      { id: branch === 'hunger' ? 'sim-step-6a' : 'sim-step-6b', delay: 4100 }
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        const el = document.getElementById(step.id);
        if (el) {
          el.classList.add('active-step', 'ring-2', 'ring-emerald-500');
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        if (index === steps.length - 1) {
          state.isSimulating = false;
          if (branch === 'hunger') {
            showToast('Simulation: Zero Hunger Route Complete', 'Surplus matched with local NGO in 4 mins. 200 meals delivered to shelter.');
          } else {
            showToast('Simulation: Zero Waste Route Complete', 'Safe window expired. Automated fail-safe redirected batch to Pallavaram Biogas Digester.');
          }
        }
      }, step.delay);
    });
  }

  function resetPipelineVisualizer() {
    document.querySelectorAll('.pipeline-step-card').forEach(card => {
      card.classList.remove('active-step', 'ring-2', 'ring-emerald-500');
    });
  }

  // --- SMARTPHONE PREVIEW (IVR & SMS MODAL) ---
  window.openPhonePreview = function (id) {
    state.selectedDonationForModal = state.donations.find(d => d.id === id) || state.donations[0];
    const don = state.selectedDonationForModal;
    if (!elements.phoneModal) return;

    renderPhoneScreen();
    elements.phoneModal.classList.remove('hidden');
    elements.phoneModal.classList.add('flex');
  };

  window.closePhoneModal = function () {
    if (!elements.phoneModal) return;
    elements.phoneModal.classList.add('hidden');
    elements.phoneModal.classList.remove('flex');
  };

  window.setPhoneMode = function (mode) {
    state.phonePreviewMode = mode;
    document.querySelectorAll('.phone-mode-btn').forEach(btn => {
      if (btn.getAttribute('data-mode') === mode) {
        btn.classList.add('bg-slate-800', 'text-white');
        btn.classList.remove('bg-slate-200', 'text-slate-700');
      } else {
        btn.classList.remove('bg-slate-800', 'text-white');
        btn.classList.add('bg-slate-200', 'text-slate-700');
      }
    });
    renderPhoneScreen();
  };

  window.setPhoneLang = function (lang) {
    state.phoneLanguage = lang;
    document.querySelectorAll('.phone-lang-btn').forEach(btn => {
      if (btn.getAttribute('data-lang') === lang) {
        btn.classList.add('bg-emerald-700', 'text-white');
        btn.classList.remove('bg-slate-200', 'text-slate-700');
      } else {
        btn.classList.remove('bg-emerald-700', 'text-white');
        btn.classList.add('bg-slate-200', 'text-slate-700');
      }
    });
    renderPhoneScreen();
  };

  function renderPhoneScreen() {
    const screen = document.getElementById('phoneSimulatorScreen');
    if (!screen) return;
    const don = state.selectedDonationForModal;
    if (!don) return;

    const lang = state.phoneLanguage;
    const mode = state.phonePreviewMode;

    if (mode === 'sms') {
      let msgText = '';
      if (lang === 'en') {
        msgText = `[CLEVER CAST ALERT - SIH26195]: Urgent Surplus Food Available!\nDonor: ${don.donorName} (${don.city})\nItems: ${don.foodItems}\nQuantity: ${don.quantityServings} servings (${don.quantityKg} kg)\nSafe Window: ${don.safeWindowHours}h remaining.\nReply "ACCEPT" to dispatch courier or tap: https://zero-hunger.gov.in/r/${don.id}`;
      } else if (lang === 'hi') {
        msgText = `[क्लीवर कास्ट अलर्ट - SIH26195]: भोजन की तत्काल उपलब्धता!\nदाता: ${don.donorName}\nमात्रा: ${don.quantityServings} लोगों का भोजन (${don.quantityKg} किलो)\nसुरक्षित समय: ${don.safeWindowHours} घंटे शेष।\nस्वीकार करने के लिए "ACCEPT" भेजें।`;
      } else if (lang === 'ta') {
        msgText = `[க்ளவர் காஸ்ட் எச்சரிக்கை - SIH26195]: உபரி உணவு தயார்!\nநன்கொடையாளர்: ${don.donorName}\nஅளவு: ${don.quantityServings} நபர்களுக்கான உணவு (${don.quantityKg} கிலோ)\nகால அவகாசம்: ${don.safeWindowHours} மணி நேரம்.\nஉடனே பெற "ACCEPT" என பதிலளிக்கவும்.`;
      }

      screen.innerHTML = `
        <div class="h-full flex flex-col justify-between p-3 text-left">
          <div>
            <div class="text-center py-2 border-b border-slate-200 mb-3">
              <span class="text-[0.65rem] text-slate-500 font-bold tracking-wider uppercase">SMS GATEWAY &bull; TWILIO / EXOTEL</span>
              <div class="text-xs font-bold text-slate-800">Govt Food Rescue Portal (VK-CLEVER)</div>
            </div>
            
            <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-slate-800 leading-relaxed shadow-sm">
              <div class="text-[0.68rem] text-emerald-800 font-bold mb-1">AUTOMATED SMS DISPATCH</div>
              <pre class="whitespace-pre-wrap font-sans text-xs text-slate-800">${msgText}</pre>
              <div class="text-[0.65rem] text-slate-400 mt-2 text-right">Sent via Twilio API &bull; Just now</div>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-200">
            <div class="flex items-center gap-2">
              <input type="text" readonly value="ACCEPT" class="w-full bg-slate-100 text-xs px-3 py-2 rounded border border-slate-300">
              <button onclick="window.triggerSimulatePickup('${don.id}'); window.closePhoneModal();" class="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded">
                Send
              </button>
            </div>
            <div class="text-[0.65rem] text-slate-500 text-center mt-1">Volunteer clicks or replies to confirm route</div>
          </div>
        </div>
      `;
    } else {
      // Voice IVR Mode
      let voiceScript = '';
      if (lang === 'en') {
        voiceScript = `"Hello volunteer! Clever Cast automated food rescue calling. ${don.quantityServings} meals are ready for pickup at ${don.donorName}. Press 1 to accept pickup. Press 2 to route to nearest biogas plant."`;
      } else if (lang === 'hi') {
        voiceScript = `"नमस्ते स्वयंसेवक! क्लीवर कास्ट स्वचालित भोजन सेवा से कॉल। ${don.donorName} पर ${don.quantityServings} लोगों का भोजन तैयार है। पिकअप स्वीकार करने के लिए 1 दबाएं।"`;
      } else if (lang === 'ta') {
        voiceScript = `"வணக்கம் தன்னார்வலரே! க்ளவர் காஸ்ட் தானியங்கி சேவை அழைக்கிறது. ${don.donorName} இல் ${don.quantityServings} பேருக்கு உணவு தயாராக உள்ளது. பெற 1-ஐ அழுத்தவும்."`;
      }

      screen.innerHTML = `
        <div class="h-full flex flex-col justify-between p-4 text-center bg-slate-900 text-white">
          <div class="pt-4">
            <div class="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto text-2xl shadow-lg mb-2 animate-bounce">
              📞
            </div>
            <div class="text-sm font-bold">CleverCast IVR Gateway</div>
            <div class="text-xs text-emerald-400 font-medium">Exotel Voice Broadcast Active &bull; 00:14</div>
          </div>

          <div class="bg-slate-800/90 rounded-xl p-3 border border-slate-700 text-xs text-slate-200 text-left">
            <div class="text-[0.65rem] font-bold text-amber-400 uppercase tracking-wider mb-1">Synthesized Voice Audio</div>
            <p class="italic text-xs text-slate-300 leading-relaxed">${voiceScript}</p>
          </div>

          <div class="space-y-2 pb-2">
            <button onclick="window.triggerSimulatePickup('${don.id}'); window.closePhoneModal();" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition shadow">
              Press [1] Accept Food Pickup
            </button>
            <button onclick="window.triggerForceBiogas('${don.id}'); window.closePhoneModal();" class="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition shadow">
              Press [2] Auto-Reroute to Biogas
            </button>
            <button onclick="window.closePhoneModal()" class="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition">
              End Call
            </button>
          </div>
        </div>
      `;
    }
  }

  // --- INTERACTIVE IMPACT & ESG CALCULATOR ---
  function setupImpactCalculator() {
    if (!elements.calcSlider) return;

    const C = window.SIH_DATA.SCIENTIFIC_CONSTANTS;

    const recalculate = () => {
      const kg = parseFloat(elements.calcSlider.value) || 250;
      if (elements.calcKgDisplay) elements.calcKgDisplay.textContent = `${kg.toLocaleString()} kg`;

      // Calculations
      const meals = Math.round(kg / C.MEAL_KG_WEIGHT);
      const biogasM3 = (kg * C.BIOGAS_M3_PER_KG_WASTE).toFixed(1);
      const lpgKg = biogasM3 * C.LPG_KG_PER_M3_BIOGAS;
      const lpgCylinders = (lpgKg / C.LPG_CYLINDER_WEIGHT_KG).toFixed(1);
      const co2AvoidedKg = Math.round(kg * C.CO2_AVOIDED_KG_PER_KG_WASTE);
      const compostKg = Math.round(kg * C.COMPOST_KG_PER_KG_WASTE);

      if (elements.calcMeals) elements.calcMeals.textContent = meals.toLocaleString();
      if (elements.calcBiogas) elements.calcBiogas.textContent = `${biogasM3} m³`;
      if (elements.calcLpg) elements.calcLpg.textContent = `${lpgCylinders} Cylinders`;
      if (elements.calcCo2) elements.calcCo2.textContent = `${co2AvoidedKg.toLocaleString()} kg`;
      if (elements.calcCompost) elements.calcCompost.textContent = `${compostKg.toLocaleString()} kg`;
    };

    elements.calcSlider.addEventListener('input', recalculate);
    recalculate();
  }

  // --- UPDATE GLOBAL METRICS ---
  function updateGlobalMetrics() {
    let totalMeals = 42850;
    let totalBiogas = 3420;
    let totalCo2Avoided = 7840;
    let activeDonations = 0;

    state.donations.forEach(d => {
      if (d.status === 'URGENT_PENDING' || d.status === 'IN_TRANSIT_NGO' || d.status === 'MATCHED_NGO') {
        activeDonations++;
      }
      if (d.status === 'COMPLETED_HUNGER') {
        totalMeals += d.quantityServings;
      }
      if (d.status === 'REROUTED_BIOGAS') {
        totalBiogas += Math.round(d.quantityKg * window.SIH_DATA.SCIENTIFIC_CONSTANTS.BIOGAS_M3_PER_KG_WASTE);
        totalCo2Avoided += Math.round(d.quantityKg * window.SIH_DATA.SCIENTIFIC_CONSTANTS.CO2_AVOIDED_KG_PER_KG_WASTE);
      }
    });

    if (elements.activeDonationCount) elements.activeDonationCount.textContent = activeDonations;
    if (elements.mealsServedCount) elements.mealsServedCount.textContent = totalMeals.toLocaleString();
    if (elements.biogasGeneratedCount) elements.biogasGeneratedCount.textContent = `${totalBiogas.toLocaleString()} m³`;
    if (elements.co2AvoidedCount) elements.co2AvoidedCount.textContent = `${totalCo2Avoided.toLocaleString()} kg`;
  }

  function updateCountdowns() {
    state.donations.forEach(don => {
      if (don.status === 'URGENT_PENDING' && don.safeWindowHours > 0) {
        don.safeWindowHours = Math.max(0, parseFloat((don.safeWindowHours - 0.1).toFixed(1)));
        if (don.safeWindowHours <= 0) {
          triggerForceBiogas(don.id);
        }
      }
    });
    renderDonationsList();
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(title, message) {
    if (!elements.toast) return;
    if (elements.toastTitle) elements.toastTitle.textContent = title;
    if (elements.toastMessage) elements.toastMessage.textContent = message;

    elements.toast.classList.add('show');
    setTimeout(() => {
      elements.toast.classList.remove('show');
    }, 4500);
  }

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
