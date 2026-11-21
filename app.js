    // === TABS LOGIC (REWRITTEN FOR RELIABILITY) ===
    const TAB_GROUPS = {
        home: [
            { id: 'home', label: '🏠 Home' } // Заглушка, чтобы логика не ломалась
        ],
        marpol: [
            { id: 'chg', label: '⛽ Changeover' },
            { id: 'orb', label: '📘 ORB Gen' },
            { id: 'bunkering', label: '⛽ Bunker' },
            { id: 'tanks', label: '⚙️ Tanks' }
        ],
        engine: [
            { id: 'fuel', label: '🧮 Fuel' },
            { id: 'lube', label: '🧴 Lube' },
            { id: 'pump', label: '🚰 Pump' },
            { id: 'tools', label: '🔩 Tools' }, /* <--- НОВАЯ ВКЛАДКА */
            { id: 'hours', label: '⏱️ Hours' },
            { id: 'nightorder', label: '🌙 Night Order' },
            { id: 'tasks', label: '🛠️ Tasks' }
        ],
        newbuild: [
            { id: 'delivery', label: '📋 Delivery' },
            { id: 'seatrial', label: '📊 Sea Trial' },
            { id: 'warranty', label: '🛡️ Warranty' }
        ],
        admin: [
            { id: 'spares', label: '📦 Spares' }
        ],
        emergency: [
            { id: 'emergency', label: '🚨 Contacts' },
            { id: 'faults', label: '🔧 Faults' },
            { id: 'notes', label: '📝 Notes' }
        ]
    };

    function switchTab(tabId, btnElement) {
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        const content = document.getElementById('tab-' + tabId);
        if(content) {
            content.style.display = 'block';
        } else {
            console.error("Tab content not found: tab-" + tabId);
        }

        if(btnElement) {
            document.querySelectorAll('#globalSubTabs .sub-tab-btn').forEach(b => b.classList.remove('active'));
            btnElement.classList.add('active');
        }
    }

    function renderSubTabs(group) {
        const container = document.getElementById('globalSubTabs');
        const tabs = TAB_GROUPS[group];
        if(!tabs) return;

        container.innerHTML = tabs.map((t, i) =>
            `<button class="sub-tab-btn ${i === 0 ? 'active' : ''}" data-tabid="${t.id}">${t.label}</button>`
        ).join('');

        container.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                switchTab(this.dataset.tabid, this);
            });
        });

        container.style.display = 'flex';
        if(tabs.length > 0) switchTab(tabs[0].id, container.querySelector('.sub-tab-btn'));
    }

    document.querySelectorAll('.main-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Скрываем под-вкладки для главного экрана
            const subTabsContainer = document.getElementById('globalSubTabs');
            if(this.dataset.group === 'home') {
                subTabsContainer.style.display = 'none';
                document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
                document.getElementById('tab-home').style.display = 'block';
                try { renderSmartSummary(); } catch(e) {} // <--- ЗАЩИТА ОТ ВЫЛЕТА
            } else {
                renderSubTabs(this.dataset.group);
            }
        });
    });

    // Функция для перехода с главного экрана на нужную вкладку
    window.goToTab = function(group, tabId) {
        const mainBtn = document.querySelector(`.main-tab-btn[data-group="${group}"]`);
        if(mainBtn) {
            mainBtn.click(); // Активируем нижнее меню
            // Ждем долю секунды, чтобы отрисовались под-вкладки, и кликаем по нужной
            setTimeout(() => {
                const subBtn = document.querySelector(`.sub-tab-btn[data-tabid="${tabId}"]`);
                if(subBtn) subBtn.click();
            }, 50);
        }
    };

    // Запуск главной страницы по умолчанию
    document.getElementById('globalSubTabs').style.display = 'none';
    document.getElementById('tab-home').style.display = 'block';
    document.getElementById('tab-chg').style.display = 'none';
    document.querySelector('.main-tab-btn[data-group="home"]').classList.add('active');
    document.querySelector('.main-tab-btn[data-group="marpol"]').classList.remove('active');

    // === DATE FORMATTER (dd-MMM-yyyy) ===
    function formatDate(dateStr) {
        if(!dateStr) return '';
        const d = new Date(dateStr);
        const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
        const day = String(d.getDate()).padStart(2, '0');
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    }

    // === COPY FUNCTION ===
    function setupCopy(btnId, boxId) {
        const btn = document.getElementById(btnId);
        if(!btn) return;
        btn.onclick = function() {
            const text = document.getElementById(boxId).innerText;
            navigator.clipboard.writeText(text).then(() => {
                this.textContent = '✅ Copied!';
                setTimeout(() => { this.textContent = '📋 Copy Text'; }, 2000);
            });
        };
    }
    setupCopy('btnCopyChg', 'resChg');
    setupCopy('btnCopyOrb', 'resOrb');
    setupCopy('btnCopyLop', 'resLop');
    setupCopy('btnCopyNo', 'resNo');

    // === TANKS MANAGEMENT V3 (DENSITY & TONNAGE) ===
    let tanks = JSON.parse(localStorage.getItem('vessel_tanks')) || [];
    let orbBunkerTanks = []; // Новая переменная для танков в ORB
    //let editingNoteId = null; // НОВАЯ ПЕРЕМЕННАЯ
    
    
    // Добавляем плотность и температуру для старых танков
    tanks = tanks.map(t => ({
        id: t.id,
        name: t.name,
        loc: t.loc || '',
        type: t.type || 'sludge',
        capacity: t.capacity || 100,
        volume: t.volume || 0,
        density: t.density || 0.95,
        temp: t.temp || 15 // <--- НОВОЕ ПОЛЕ (по умолчанию 15)
    }));

    if(tanks.length === 0) {
        tanks = [
            {id: 't1', name: 'NO.1 HFO TANK', loc: 'P', type: 'fuel', capacity: 500, volume: 200, density: 0.95, temp: 15},
            {id: 't2', name: 'NO.2 HFO TANK', loc: 'S', type: 'fuel', capacity: 500, volume: 150, density: 0.95, temp: 15},
            {id: 't3', name: 'MGO TANK', loc: 'C', type: 'fuel', capacity: 100, volume: 50, density: 0.85, temp: 15},
            {id: 't4', name: 'MAIN LO TANK', loc: 'C', type: 'lube', capacity: 15, volume: 8, density: 0.90, temp: 15},
            {id: 't5', name: 'CYL LO TANK', loc: 'C', type: 'lube', capacity: 5, volume: 3, density: 0.90, temp: 15},
            {id: 't6', name: 'SLUDGE TANK', loc: 'FR 21-28 P', type: 'sludge', capacity: 20, volume: 5, density: 0.95, temp: 15},
            {id: 't7', name: 'BILGE HOLDING TANK', loc: 'FR 13-19 C', type: 'bilge', capacity: 30, volume: 10, density: 1.00, temp: 15}
        ];
    }
    localStorage.setItem('vessel_tanks', JSON.stringify(tanks));

    let currentTankGroup = 'fuel';
    let currentFuelType = 'hfo'; // НОВАЯ ПЕРЕМЕННАЯ

    window.setFuelType = function(type) {
        currentFuelType = type;
        const btnHfo = document.getElementById('btn-hfo');
        const btnDo = document.getElementById('btn-do');
        if(btnHfo && btnDo) {
            btnHfo.classList.toggle('active', type === 'hfo');
            btnDo.classList.toggle('active', type === 'do');
        }
        renderTankCards();
    };

    function renderTankCards() {
        const container = document.getElementById('tankCardsContainer');
        const title = document.getElementById('tankGroupTitle');
        const planner = document.getElementById('bunkerPlannerCard');
        if(!container) return;

        // Показываем/скрываем подвкладки HFO/DO
        const fuelSubTabs = document.getElementById('fuelSubTabs');
        if(fuelSubTabs) {
            fuelSubTabs.style.display = (currentTankGroup === 'fuel') ? 'flex' : 'none';
        }

        if(currentTankGroup === 'fuel') { 
            title.textContent = currentFuelType === 'hfo' ? 'HFO Tanks' : 'DO Tanks'; 
            planner.style.display = 'block'; 
        }
        else if(currentTankGroup === 'lube') { title.textContent = 'Lube Oil Tanks'; planner.style.display = 'block'; }
        else { title.textContent = 'Sludge & Bilge Tanks'; planner.style.display = 'none'; }

        const filteredTanks = tanks.filter(t => {
            if(currentTankGroup === 'residue') return (t.type === 'sludge' || t.type === 'bilge');
            if(currentTankGroup === 'fuel') return t.type === 'fuel' && (t.fuelType || 'hfo') === currentFuelType; // Фильтр HFO/DO
            return t.type === currentTankGroup;
        });

        if(filteredTanks.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">No tanks in this group.</div>';
            return;
        }

        const density = parseFloat(document.getElementById('planDensity').value) || 0.95;

        container.innerHTML = filteredTanks.map(t => {
            const fillPercent = Math.min((t.volume / t.capacity) * 100, 100);
            const isHigh = fillPercent >= 85;
            const barColor = isHigh ? 'var(--red)' : (fillPercent > 60 ? 'var(--yellow)' : 'var(--green)');
            const warning = isHigh ? '<span style="color:var(--red); font-weight:bold; font-size:0.75rem;">HIGH LEVEL!</span>' : '';
            
            let bunkerCalcHTML = '';
            if(currentTankGroup !== 'residue') {
                const spaceTo85 = (t.capacity * 0.85) - t.volume;
                if(spaceTo85 > 0) {
                    const mtTo85 = spaceTo85 * density;
                    bunkerCalcHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--accent); background:rgba(56,189,248,0.08); padding:8px 12px; border-radius:8px; border:1px solid rgba(56,189,248,0.2);">
                            <span>Free to 85%</span>
                            <span><b>${spaceTo85.toFixed(1)} m³</b> <span style="opacity:0.7;">(~${mtTo85.toFixed(1)} MT)</span></span>
                        </div>
                    `;
                } else {
                     bunkerCalcHTML = `
                        <div style="display:flex; justify-content:center; align-items:center; font-size:0.75rem; color:var(--red); background:rgba(248,113,113,0.08); padding:8px 12px; border-radius:8px; border:1px solid rgba(248,113,113,0.2); font-weight:600;">
                            ⚠️ No space to 85% limit
                        </div>
                    `;
                }
            }

            // Расчет по стандарту ASTM / VCF
            const dens = t.density;
            const temp = t.temp;
            // Берем коэффициент VCF из таблицы (если функция getVcf не видит плотность, берем средний 0.00065)
            const vcf = typeof getVcf === 'function' ? (getVcf(dens) || 0.00065) : 0.00065; 
            
            // Объем, приведенный к 15°C
            const vol15 = t.volume - vcf * (temp - 15);
            // Масса в метрических тоннах
            const currentMT = vol15 * dens; 

            return `
                <div style="background:linear-gradient(180deg, rgba(30,45,72,0.4) 0%, rgba(13,22,39,0.6) 100%); border:1px solid ${isHigh ? 'rgba(248,113,113,0.3)' : 'var(--border)'}; border-radius:16px; padding:16px; margin-bottom:16px; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
                    
                    <!-- Шапка карточки -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                        <div>
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                                <div style="font-weight:700; font-size:1.05rem; color:var(--text); letter-spacing:0.5px;">${t.name}</div>
                                ${isHigh ? `<div style="background:rgba(248,113,113,0.15); color:var(--red); padding:2px 6px; border-radius:4px; font-size:0.6rem; font-weight:800; letter-spacing:1px; border:1px solid rgba(248,113,113,0.3); box-shadow: 0 0 10px rgba(248,113,113,0.2);">HIGH LEVEL</div>` : ''}
                            </div>
                            <div style="font-size:0.7rem; color:var(--text-muted); font-weight:500;">${t.loc} • ${t.type.toUpperCase()}</div>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button class="btn" style="margin-top:0; padding:6px 10px; font-size:0.75rem; background:rgba(56,189,248,0.15); color:var(--accent); border:1px solid rgba(56,189,248,0.3);" onclick="updateTankVolume('${t.id}')">✏️ Vol</button>
                            <button class="btn-danger" style="padding:6px 10px; font-size:0.75rem; background:rgba(248,113,113,0.1); color:var(--red); border:1px solid rgba(248,113,113,0.2);" onclick="deleteTank('${t.id}')">🗑️</button>
                        </div>
                    </div>

                    <!-- ГЛАВНЫЙ БЛОК: Слева данные, Справа вертикальный стакан -->
                    <div style="display:flex; gap:16px;">
                        
                        <!-- ЛЕВАЯ ЧАСТЬ (Данные и инпуты) -->
                        <div style="flex:1;">
                            <!-- Сетка данных -->
                            <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:12px;">
                                <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
                                    <span style="color:var(--text-muted);">Volume:</span>
                                    <span style="font-weight:700; color:var(--text);">${t.volume.toFixed(1)} m³</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
                                    <span style="color:var(--text-muted);">Weight:</span>
                                    <span style="font-weight:700; color:var(--green);">${currentMT.toFixed(2)} MT</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
                                    <span style="color:var(--text-muted);">Capacity:</span>
                                    <span style="font-weight:700; color:${barColor};">${fillPercent.toFixed(1)}%</span>
                                </div>
                            </div>

                            <!-- Инпуты плотности и температуры -->
                            <div style="display:flex; flex-direction:column; gap:8px;">
                                <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.3); padding:6px 10px; border-radius:8px; border:1px solid var(--border);">
                                    <span style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase;">Dens</span>
                                    <div style="display:flex; align-items:baseline; gap:2px;">
                                        <input type="number" step="0.001" value="${t.density}" onchange="updateTankDensity('${t.id}', this.value)" style="width:45px; padding:0; font-size:0.85rem; font-weight:700; background:transparent; border:none; color:var(--accent); text-align:right; outline:none;">
                                    </div>
                                </div>
                                <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.3); padding:6px 10px; border-radius:8px; border:1px solid var(--border);">
                                    <span style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase;">Temp</span>
                                    <div style="display:flex; align-items:baseline; gap:2px;">
                                        <input type="number" step="0.1" value="${t.temp}" onchange="updateTankTemp('${t.id}', this.value)" style="width:35px; padding:0; font-size:0.85rem; font-weight:700; background:transparent; border:none; color:var(--yellow); text-align:right; outline:none;">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ПРАВАЯ ЧАСТЬ (Вертикальный стакан) -->
                        <div style="width: 70px; flex-shrink: 0; height: 140px; position: relative; border: 2px solid ${barColor}; border-radius: 12px; overflow: hidden; background: rgba(0,0,0,0.5); box-shadow: inset 0 0 15px rgba(0,0,0,0.8);">
                            <!-- Заливка -->
                            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: ${fillPercent}%; background: ${barColor}; box-shadow: 0 0 15px ${barColor}; transition: height 0.4s ease, background 0.3s;"></div>
                            
                            <!-- Линия 85% -->
                            <div style="position: absolute; bottom: 85%; left: 0; right: 0; height: 1px; background: rgba(255,255,255,0.7); border-bottom: 1px dashed rgba(0,0,0,0.5); z-index: 2;"></div>
                            <div style="position: absolute; bottom: 85%; right: 2px; font-size: 0.5rem; color: #fff; background: rgba(0,0,0,0.6); padding: 0 2px; border-radius: 2px; z-index: 3; transform: translateY(50%);">85%</div>
                            
                            <!-- Текст по центру -->
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 0.85rem; font-weight: 800; color: #fff; text-shadow: 0 1px 3px #000; z-index: 4;">
                                ${fillPercent.toFixed(0)}%
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 12px;">
                        ${bunkerCalcHTML}
                    </div>
                </div>
            `;
        }).join('');
    }

    window.updateTankTemp = function(id, newTemp) {
        const t = tanks.find(x => x.id === id);
        if(!t) return;
        const val = parseFloat(newTemp.toString().replace(',', '.'));
        if(!isNaN(val) && val > 0 && val < 100) {
            t.temp = val;
            localStorage.setItem('vessel_tanks', JSON.stringify(tanks));
            renderTankCards();
        } else {
            alert('Некорректная температура');
            renderTankCards();
        }
    };

    window.updateTankDensity = function(id, newDensity) {
        const t = tanks.find(x => x.id === id);
        if(!t) return;
        const val = parseFloat(newDensity.toString().replace(',', '.'));
        if(!isNaN(val) && val > 0.5 && val < 1.1) {
            t.density = val;
            localStorage.setItem('vessel_tanks', JSON.stringify(tanks));
            renderTankCards(); // Перерисовываем карточку с новыми тоннами
        } else {
            alert('Некорректная плотность');
            renderTankCards(); // Возвращаем старое значение
        }
    };

    window.updateTankVolume = function(id) {
        const t = tanks.find(x => x.id === id);
        if(!t) return;
        const newVol = prompt(`Enter current volume for ${t.name} (m3).\nMax: ${t.capacity}`, t.volume);
        if(newVol !== null && !isNaN(newVol)) {
            t.volume = Math.min(parseFloat(newVol), t.capacity);
            localStorage.setItem('vessel_tanks', JSON.stringify(tanks));
            renderTankCards();
            renderOrbFields();
        }
    };

    window.deleteTank = function(id) {
        if(!confirm('Delete this tank?')) return;
        tanks = tanks.filter(t => t.id !== id);
        localStorage.setItem('vessel_tanks', JSON.stringify(tanks));
        renderTankCards();
        renderOrbFields(); 
    };

    document.getElementById('btnAddTank').onclick = () => {
        const name = document.getElementById('newTankName').value.trim();
        const loc = document.getElementById('newTankLoc').value.trim();
        const type = document.getElementById('newTankType').value;
                // Автоматически назначаем тип топлива (HFO или DO) в зависимости от открытой вкладки
        let assignedFuelType = (newTankType === 'fuel') ? currentFuelType : null;
        const cap = parseFloat(document.getElementById('newTankCap').value);
        
        if (!name || isNaN(cap) || cap <= 0) { alert('Enter name and capacity'); return; }
        
        const dens = parseFloat(document.getElementById('newTankDensity').value) || 0.95;
        const temp = parseFloat(document.getElementById('newTankTemp').value) || 15;
        tanks.push({ id: 't_' + Date.now(), name: name, loc: loc, type: type, capacity: cap, volume: 0, density: dens, temp: temp, fuelType: assignedFuelType });
        localStorage.setItem('vessel_tanks', JSON.stringify(tanks));
        
        document.getElementById('newTankName').value = '';
        document.getElementById('newTankLoc').value = '';
        document.getElementById('newTankCap').value = '';
        
        if(type === 'sludge' || type === 'bilge') currentTankGroup = 'residue';
        else currentTankGroup = type;
        document.querySelectorAll('[data-tankgroup]').forEach(b => {
            if(b.dataset.tankgroup === currentTankGroup) b.classList.add('active');
            else b.classList.remove('active');
        });

        renderTankCards();
        renderOrbFields();
    };

    document.getElementById('planDensity').oninput = renderTankCards;

    document.querySelectorAll('[data-tankgroup]').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('[data-tankgroup]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTankGroup = btn.dataset.tankgroup;
            renderTankCards();
        };
    });

    // === CHANGEOVER GENERATOR ===
    document.getElementById('chgDate').valueAsDate = new Date();
    document.getElementById('btnGenChg').onclick = () => {
        const date = formatDate(document.getElementById('chgDate').value);
        const pos = document.getElementById('chgPos').value || 'N/A';
        const type = document.getElementById('chgType').value;
        const sulfur = document.getElementById('chgSulfur').value;
        const start = document.getElementById('chgStart').value;
        const finish = document.getElementById('chgFinish').value;
        const vStart = document.getElementById('chgViscStart').value || 'N/A';
        const vEnd = document.getElementById('chgViscEnd').value || 'N/A';

        if(!start || !finish) { alert('Enter Start and Finish times.'); return; }

        let text = `${date} at Position: ${pos}\n`;
        text += `Commenced fuel oil changeover from ${type.split(' to ')[0]} to ${type.split(' to ')[1]}.\n`;
        text += `Start Time: ${start}. Initial Viscosity: ${vStart} cSt.\n`;
        text += `Completed fuel oil changeover at ${finish}.\n`;
        text += `Final Viscosity: ${vEnd} cSt. Sulfur content: max ${sulfur}% m/m.\n`;
        text += `Changeover procedure performed in accordance with vessel's approved changeover plan.`;

        document.getElementById('resChg').innerText = text;
        document.getElementById('resChg').style.display = 'block';
        document.getElementById('btnCopyChg').style.display = 'block';
    };

    // === ORB DYNAMIC FIELDS ===
    const orbFields = {
        'C11.1': `
            <div class="form-group"><label>Tank (Sludge / Танк шлама)</label><select id="orbSourceTank" class="tank-select-sludge"></select></div>
            <div class="row-2">
                <div class="form-group"><label>Capacity (Вместимость, m³)</label><input type="number" id="orbCap" step="0.01"></div>
                <div class="form-group"><label>Quantity Retained (Остаток, m³)</label><input type="number" id="orbRetained" step="0.01"></div>
            </div>
        `,
        'C11.4': `
            <div class="form-group"><label>Destination Tank (Танк назначения, шлам)</label><select id="orbDestTank" class="tank-select-sludge"></select></div>
            <div class="row-2">
                <div class="form-group"><label>Capacity (Вместимость, m³)</label><input type="number" id="orbCap" step="0.01"></div>
                <div class="form-group"><label>Quantity Retained (Остаток, m³)</label><input type="number" id="orbRetained" step="0.01"></div>
            </div>
            <div class="row-2">
                <div class="form-group"><label>Quantity collected (Собрано, m³)</label><input type="number" id="orbQty" step="0.01"></div>
                <div class="form-group"><label>Source of Sludge (Источник)</label><input type="text" id="orbSource" placeholder="e.g. M/E Sump Tank"></div>
            </div>
        `,
        'C12.1': `
            <div class="form-group"><label>Source Tank (Танк шлама, источник)</label><select id="orbSourceTank" class="tank-select-sludge"></select></div>
            <div class="row-2">
                <div class="form-group"><label>Quantity (Сдано, m³)</label><input type="number" id="orbQty" step="0.01"></div>
                <div class="form-group"><label>Quantity retained (Остаток, m³)</label><input type="number" id="orbRetained" step="0.01"></div>
            </div>
            <div class="form-group"><label>Receiver (Приемщик: Баржа/Трал)</label><input type="text" id="orbReceiver" placeholder="e.g. Barge 'Eco-Service'"></div>
            <div class="form-group"><label>Port Name (Порт сдачи)</label><input type="text" id="orbPort" placeholder="e.g. Fujairah"></div>
        `,
        'C12.2': `
            <div class="form-group"><label>Source Tank (Танк шлама, источник)</label><select id="orbSourceTank" class="tank-select-sludge"></select></div>
            <div class="form-group"><label>Destination Tank (Танк назначения)</label><select id="orbDestTank" class="tank-select-all"></select></div>
            <div class="form-group"><label>Substance (Что перекачиваем)</label><select id="orbSubstance"><option value="sludge transferred">Sludge (Шлам)</option><option value="water drained">Water (Вода)</option></select></div>
            <div class="row-2">
                <div class="form-group"><label>Quantity transferred (Перекачано, m³)</label><input type="number" id="orbQty" step="0.01"></div>
                <div class="form-group"><label>Retained in source (Остаток в источнике, m³)</label><input type="number" id="orbRetained" step="0.01"></div>
            </div>
            <div class="form-group"><label>Retained in destination (Остаток в приемнике, m³)</label><input type="number" id="orbRetainedDest" step="0.01"></div>
        `,
        'C12.3': `
            <div class="form-group"><label>Source Tank (Танк шлама, источник)</label><select id="orbSourceTank" class="tank-select-sludge"></select></div>
            <div class="row-2">
                <div class="form-group"><label>Quantity incinerated (Сожжено, m³)</label><input type="number" id="orbQty" step="0.01"></div>
                <div class="form-group"><label>Quantity retained (Остаток, m³)</label><input type="number" id="orbRetained" step="0.01"></div>
            </div>
            <div class="form-group"><label>Duration (Время горения, часы)</label><input type="number" id="orbHours" step="0.1"></div>
        `,
        'C12.4': `
            <div class="form-group"><label>Source Tank (Танк шлама, источник)</label><select id="orbSourceTank" class="tank-select-sludge"></select></div>
            <div class="form-group"><label>Method (Метод)</label><select id="orbMethod"><option value="water evaporated">Evaporation (Испарение воды)</option><option value="sludge">Boiler (Сжигание в котле)</option></select></div>
            <div class="row-2">
                <div class="form-group"><label>Quantity (m³)</label><input type="number" id="orbQty" step="0.01"></div>
                <div class="form-group"><label>Quantity retained (Остаток, m³)</label><input type="number" id="orbRetained" step="0.01"></div>
            </div>
            <div class="form-group"><label>Duration (Время горения, часы - для котла)</label><input type="number" id="orbHours" step="0.1"></div>
        `,
        'D15.1': `
            <div class="form-group"><label>Source Tank (Танк льяльных вод)</label><select id="orbSourceTank" class="tank-select-bilge"></select></div>
            <div class="row-2">
                <div class="form-group"><label>Quantity (Сброшено, m³)</label><input type="number" id="orbQty" step="0.01"></div>
                <div class="form-group"><label>Capacity of tank (Вместимость, m³)</label><input type="number" id="orbCap" step="0.01"></div>
            </div>
            <div class="form-group"><label>Quantity retained (Остаток, m³)</label><input type="number" id="orbRetained" step="0.01"></div>
            <div class="row-2">
                <div class="form-group"><label>Start (GMT / UTC)</label><input type="time" id="orbStartGmt"></div>
                <div class="form-group"><label>Start (LT / Судовое)</label><input type="time" id="orbStartLt"></div>
            </div>
            <div class="row-2">
                <div class="form-group"><label>Stop (GMT / UTC)</label><input type="time" id="orbStopGmt"></div>
                <div class="form-group"><label>Stop (LT / Судовое)</label><input type="time" id="orbStopLt"></div>
            </div>
            <div class="form-group"><label>Position Start (Координаты начала)</label><input type="text" id="orbPosStart" placeholder="LAT 12-34.5N LONG 056-78.9E"></div>
            <div class="form-group"><label>Position Stop (Координаты конца)</label><input type="text" id="orbPosStop" placeholder="LAT 12-35.0N LONG 056-79.2E"></div>
        `,
        'D15.2': `
            <div class="form-group"><label>Source Tank (Танк льял, источник)</label><select id="orbSourceTank" class="tank-select-bilge"></select></div>
            <div class="row-2">
                <div class="form-group"><label>Quantity (Сдано, m³)</label><input type="number" id="orbQty" step="0.01"></div>
                <div class="form-group"><label>Quantity retained (Остаток, m³)</label><input type="number" id="orbRetained" step="0.01"></div>
            </div>
            <div class="row-2">
                <div class="form-group"><label>Start (GMT)</label><input type="time" id="orbStartGmt"></div>
                <div class="form-group"><label>Start (LT)</label><input type="time" id="orbStartLt"></div>
            </div>
            <div class="row-2">
                <div class="form-group"><label>Stop (GMT)</label><input type="time" id="orbStopGmt"></div>
                <div class="form-group"><label>Stop (LT)</label><input type="time" id="orbStopLt"></div>
            </div>
            <div class="form-group"><label>Port / Reception (Порт / Приемщик)</label><input type="text" id="orbPort" placeholder="e.g. Rotterdam"></div>
            <div class="form-group"><label>Receipt No. (Номер квитанции)</label><input type="text" id="orbReceipt" placeholder="e.g. 453"></div>
        `,
        'D15.3': `
            <div class="form-group"><label>Source Tank (Танк льял, источник)</label><select id="orbSourceTank" class="tank-select-bilge"></select></div>
            <div class="form-group"><label>Destination Tank (Танк назначения)</label><select id="orbDestTank" class="tank-select-all"></select></div>
            <div class="row-2">
                <div class="form-group"><label>Quantity (Перекачано, m³)</label><input type="number" id="orbQty" step="0.01"></div>
                <div class="form-group"><label>Retained in source (Остаток в источнике, m³)</label><input type="number" id="orbRetained" step="0.01"></div>
            </div>
            <div class="row-2">
                <div class="form-group"><label>Start (GMT)</label><input type="time" id="orbStartGmt"></div>
                <div class="form-group"><label>Start (LT)</label><input type="time" id="orbStartLt"></div>
            </div>
            <div class="row-2">
                <div class="form-group"><label>Stop (GMT)</label><input type="time" id="orbStopGmt"></div>
                <div class="form-group"><label>Stop (LT)</label><input type="time" id="orbStopLt"></div>
            </div>
            <div class="form-group"><label>Retained in destination (Остаток в приемнике, m³)</label><input type="number" id="orbRetainedDest" step="0.01"></div>
        `,
        'F19': `
            <div class="row-2">
                <div class="form-group"><label>Time of Failure (Время поломки GMT)</label><input type="time" id="orbStartGmt"></div>
                <div class="form-group"><label>Time of Failure (Время поломки LT)</label><input type="time" id="orbStartLt"></div>
            </div>
            <div class="row-2">
                <div class="form-group"><label>Time Restored (Время ремонта GMT)</label><input type="time" id="orbStopGmt"></div>
                <div class="form-group"><label>Time Restored (Время ремонта LT)</label><input type="time" id="orbStopLt"></div>
            </div>
            <div class="form-group"><label>Reason for Failure (Причина)</label><input type="text" id="orbSource" placeholder="e.g. FAILURE OF FILTER ELEMENT"></div>
        `,
        'H_FUEL': `
            <div class="form-group"><label>26.1 Port (Порт)</label><input type="text" id="hPort" placeholder="e.g. FUJAIRAH"></div>
            <div class="row-2">
                <div class="form-group"><label>26.2 Start Time (GMT)</label><input type="time" id="hStart"></div>
                <div class="form-group"><label>26.2 Stop Time (GMT)</label><input type="time" id="hStop"></div>
            </div>
            <div class="row-2">
                <div class="form-group"><label>26.3 Total Quantity (MT)</label><input type="number" id="hQty" step="0.01" placeholder="xxxx"></div>
                <div class="form-group"><label>26.3 ISO Designation</label><input type="text" id="hIso" placeholder="e.g. ISO 8217 RMG 380"></div>
            </div>
            <div class="row-2">
                <div class="form-group"><label>26.3 Fuel Type</label><input type="text" id="hType" placeholder="e.g. HFO"></div>
                <div class="form-group"><label>26.3 Sulphur (%)</label><input type="number" id="hSulphur" step="0.01" placeholder="e.g. 0.50"></div>
            </div>
            <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-bottom:10px;">
                <label style="font-size:0.75rem; color:var(--accent); margin-bottom:5px; display:block;">Tank 1 (Танк 1)</label>
                <div class="form-group"><select id="hTank1Name" class="tank-select-all"></select></div>
                <div class="row-2">
                    <div class="form-group"><label>Added MT (Добавлено)</label><input type="number" id="hTank1Add" step="0.01"></div>
                    <div class="form-group"><label>Now containing MT (Стало)</label><input type="number" id="hTank1Total" step="0.01"></div>
                </div>
            </div>
            <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-bottom:10px;">
                <label style="font-size:0.75rem; color:var(--accent); margin-bottom:5px; display:block;">Tank 2 (Танк 2 - Опционально)</label>
                <div class="form-group"><select id="hTank2Name" class="tank-select-all"></select></div>
                <div class="row-2">
                    <div class="form-group"><label>Added MT</label><input type="number" id="hTank2Add" step="0.01"></div>
                    <div class="form-group"><label>Now containing MT</label><input type="number" id="hTank2Total" step="0.01"></div>
                </div>
            </div>
            <div class="form-group"><label>Officer Name & Rank (Имя и должность)</label><input type="text" id="hOfficer" placeholder="e.g. A. Ivanov, Chief Engineer"></div>
        `,
        'H_LUBE': `
            <div class="form-group"><label>26.1 Port (Порт)</label><input type="text" id="hPort" placeholder="e.g. ROTTERDAM"></div>
            <div class="row-2">
                <div class="form-group"><label>26.2 Start Time (GMT)</label><input type="time" id="hStart"></div>
                <div class="form-group"><label>26.2 Stop Time (GMT)</label><input type="time" id="hStop"></div>
            </div>
            <div class="row-2">
                <div class="form-group"><label>26.4 Total Quantity (MT)</label><input type="number" id="hQty" step="0.01" placeholder="xx"></div>
                <div class="form-group"><label>26.4 Type of Oil (Тип масла)</label><input type="text" id="hType" placeholder="e.g. SAE 40"></div>
            </div>
            <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-bottom:10px;">
                <label style="font-size:0.75rem; color:var(--accent); margin-bottom:5px; display:block;">Tank 1 (Танк 1)</label>
                <div class="form-group"><select id="hTank1Name" class="tank-select-all"></select></div>
                <div class="row-2">
                    <div class="form-group"><label>Added MT (Добавлено)</label><input type="number" id="hTank1Add" step="0.01"></div>
                    <div class="form-group"><label>Now containing MT (Стало)</label><input type="number" id="hTank1Total" step="0.01"></div>
                </div>
            </div>
            <div class="form-group"><label>Officer Name & Rank</label><input type="text" id="hOfficer" placeholder="e.g. A. Ivanov, Chief Engineer"></div>
        `,
        'I_ALARM': `
            <div class="row-2">
                <div class="form-group"><label>Start (GMT)</label><input type="time" id="orbStartGmt"></div>
                <div class="form-group"><label>Start (LT)</label><input type="time" id="orbStartLt"></div>
            </div>
            <div class="row-2">
                <div class="form-group"><label>Stop (GMT)</label><input type="time" id="orbStopGmt"></div>
                <div class="form-group"><label>Stop (LT)</label><input type="time" id="orbStopLt"></div>
            </div>
        `,
        'I_BILGE': `
            <div class="form-group"><label>Bilge Holding Tank (Танк льяльных вод)</label><select id="orbSourceTank" class="tank-select-bilge"></select></div>
            <div class="row-2">
                <div class="form-group"><label>Capacity (Вместимость, m³)</label><input type="number" id="orbCap" step="0.01"></div>
                <div class="form-group"><label>Retained (Остаток, m³)</label><input type="number" id="orbRetained" step="0.01"></div>
            </div>
        `,
        'I_VALVE': `
            <div class="form-group"><label>Action (Действие)</label><select id="orbAction"><option value="UNSEALED">UNSEALED (Распломбирован)</option><option value="SEALED">SEALED (Запломбирован)</option></select></div>
            <div class="form-group"><label>Valve No. (Номер клапана)</label><input type="text" id="orbSource" placeholder="e.g. B059V"></div>
            <div class="form-group"><label>Seal No. (Номер пломбы)</label><input type="text" id="orbReceipt" placeholder="e.g. 979904"></div>
        `,
        'G': `
            <div class="row-2">
                <div class="form-group"><label>Time (GMT)</label><input type="time" id="orbStartGmt"></div>
                <div class="form-group"><label>Time (LT)</label><input type="time" id="orbStartLt"></div>
            </div>
            <div class="form-group"><label>Place or Position (Место / Координаты)</label><input type="text" id="orbPosStart" placeholder="LAT XXX LONG XXX"></div>
            <div class="form-group"><label>Type and Quantity (Тип и количество)</label><input type="text" id="orbSource" placeholder="e.g. 0.1 m³ HFO"></div>
            <div class="form-group"><label>Circumstances (Обстоятельства)</label><textarea id="orbText" placeholder="e.g. Fuel tank overflow during bunkering"></textarea></div>
        `
    };

    const codeSelect = document.getElementById('orbCodeSelect');
    const dynamicContainer = document.getElementById('orbDynamicFields');

    function getFullTankName(id) {
        const sel = document.getElementById(id);
        if(!sel) return '';
        return sel.options[sel.selectedIndex].text;
    }

    function populateTankSelects() {
        const sludgeTanks = tanks.filter(t => t.type === 'sludge');
        const bilgeTanks = tanks.filter(t => t.type === 'bilge');
        
        function fillSelect(selector, list, defaultName) {
            document.querySelectorAll(selector).forEach(sel => {
                if(list.length === 0) sel.innerHTML = `<option value="${defaultName}">${defaultName}</option>`;
                else sel.innerHTML = list.map(t => `<option value="${t.name} ${t.loc ? t.loc : ''}">${t.name} ${t.loc ? t.loc : ''}</option>`).join('');
            });
        }

        fillSelect('.tank-select-sludge', sludgeTanks, 'SLUDGE TANK');
        fillSelect('.tank-select-bilge', bilgeTanks, 'OILY BILGE TANK');
        
        document.querySelectorAll('.tank-select-all').forEach(sel => {
            sel.innerHTML = tanks.map(t => `<option value="${t.name} ${t.loc ? t.loc : ''}">${t.name} ${t.loc ? t.loc : ''}</option>`).join('');
        });
    }

    function renderOrbFields() {
        if(!dynamicContainer) return;
        dynamicContainer.innerHTML = orbFields[codeSelect.value];
        populateTankSelects();
    }
    codeSelect.onchange = renderOrbFields;

    // === ORB GENERATOR LOGIC ===
    document.getElementById('btnGenOrb').onclick = () => {
        const dateStr = formatDate(document.getElementById('chgDate').value);
        const code = codeSelect.value;
        let text = `Date: ${dateStr}\n`;
        
        const val = (id) => document.getElementById(id) ? document.getElementById(id).value : '';
        const tank = (id) => getFullTankName(id);

        if(code === 'C11.1') {
            text += `C11.1 ${tank('orbSourceTank')}\n11.2 ${val('orbCap')} m³\n11.3 ${val('orbRetained')} m³`;
        } 
        else if(code === 'C11.4') {
            text += `C11.1 ${tank('orbDestTank')}\n11.2 ${val('orbCap')} m³\n11.3 ${val('orbRetained')} m³\n11.4 ${val('orbQty')} m³ collected from ${val('orbSource')}`;
        }
        else if(code === 'C12.1') {
            text += `C12.1 ${val('orbQty')} m³ sludge from ${tank('orbSourceTank')}, ${val('orbRetained')} m³ retained,\nto "${val('orbReceiver')}" during port stay (${val('orbPort')})`;
        }
        else if(code === 'C12.2') {
            text += `C12.2 ${val('orbQty')} m³ ${val('orbSubstance')} from ${tank('orbSourceTank')}, ${val('orbRetained')} m³ retained,\nto ${tank('orbDestTank')} retained in tank(s) ${val('orbRetainedDest')} m³`;
        }
        else if(code === 'C12.3') {
            text += `C12.3 ${val('orbQty')} m³ sludge from ${tank('orbSourceTank')}, ${val('orbRetained')} m³ retained,\nBurned in Incinerator for ${val('orbHours')} hours`;
        }
        else if(code === 'C12.4') {
            if(val('orbMethod') === 'sludge') {
                text += `C12.4 ${val('orbQty')} m³ sludge from ${tank('orbSourceTank')}, ${val('orbRetained')} m³ retained,\nBurned in Boiler for ${val('orbHours')} hours`;
            } else {
                text += `C12.4 ${val('orbQty')} m³ water evaporated from ${tank('orbSourceTank')}, ${val('orbRetained')} m³ retained.`;
            }
        }
        else if(code === 'D15.1') {
            text += `D13 ${val('orbQty')} m³ bilge water from ${tank('orbSourceTank')}\nCapacity ${val('orbCap')} m³, ${val('orbRetained')} m³ retained\n`;
            text += `14\nStart: ${val('orbStartGmt')}H GMT / ${val('orbStartLt')}H LT, stop: ${val('orbStopGmt')}H GMT / ${val('orbStopLt')}H LT\n`;
            text += `15.1\nThrough 15 ppm equipment overboard\nPosition start: ${val('orbPosStart')}\nPosition stop: ${val('orbPosStop')}`;
        }
        else if(code === 'D15.2') {
            text += `D13 ${val('orbQty')} m³ bilge water from ${tank('orbSourceTank')}, ${val('orbRetained')} m³ retained\n`;
            text += `14\nStart: ${val('orbStartGmt')}H GMT / ${val('orbStartLt')}H LT, stop: ${val('orbStopGmt')}H GMT / ${val('orbStopLt')}H LT\n`;
            text += `15.2\nTo port reception facilities of ${val('orbPort')}, receipt No: ${val('orbReceipt')}`;
        }
        else if(code === 'D15.3') {
            text += `D13 ${val('orbQty')} m³ bilge water from ${tank('orbSourceTank')}, ${val('orbRetained')} m³ retained\n`;
            text += `14\nStart: ${val('orbStartGmt')}H GMT / ${val('orbStartLt')}H LT, stop: ${val('orbStopGmt')}H GMT / ${val('orbStopLt')}H LT\n`;
            text += `15.3\nTo ${tank('orbDestTank')}, retained in tank(s) ${val('orbRetainedDest')} m³`;
        }
        else if(code === 'F19') {
            text += `F19 ${val('orbStartGmt')}H GMT / ${val('orbStartLt')}H LT\n20 ${val('orbStopGmt')}H GMT / ${val('orbStopLt')}H LT\n21 ${val('orbSource')}`;
        }
        else if(code === 'I_ALARM') {
            text += `I Tested 15 ppm alarm in OCM unit\nStart: ${val('orbStartGmt')}H GMT / ${val('orbStartLt')}H LT, stop: ${val('orbStopGmt')}H GMT / ${val('orbStopLt')}H LT\nFound working properly`;
        }
        else if(code === 'I_BILGE') {
            text += `I Weekly Inventory of Bilge Water Tanks (listed under item 3.3)\n${tank('orbSourceTank')}\ncapacity ${val('orbCap')} m³, ${val('orbRetained')} m³ retained`;
        }
        else if(code === 'I_VALVE') {
            var action = val('orbAction');
            if(action === 'UNSEALED') {
                text += `I Overboard valve ${val('orbSource')} from 15 ppm bilge water separator unit unsealed\nfor normal operation of 15 ppm unit\nseal No.: ${val('orbReceipt')}`;
            } else {
                text += `I Overboard valve ${val('orbSource')} from 15 ppm bilge water separator unit sealed\nseal No.: ${val('orbReceipt')}`;
            }
        }
        else if(code === 'G') {
            text += `G22 ${val('orbStartGmt')}H GMT / ${val('orbStartLt')}H LT\n23 Place or Position: ${val('orbPosStart')}\n24 Type and Quantity of oily residue (if known): ${val('orbSource')}\n25 Circumstances of the discharge: ${val('orbText')}`;
        }
        else if(code === 'H_FUEL') {
            text = `Date: ${dateStr}\nCode: H\n\n`;
            text += `26.1 ${val('hPort')}\n`;
            text += `26.2 Start ${dateStr}-${val('hStart')} Stop ${dateStr}-${val('hStop')}\n`;
            text += `26.3 ${val('hQty')} MT of ${val('hIso')} ${val('hType')} ${val('hSulphur')} % S bunkered in tanks:\n`;
            
            const t1Name = tank('hTank1Name');
            if(t1Name) text += `${val('hTank1Add')} MT added to ${t1Name} now containing ${val('hTank1Total')} MT\n`;
            
            const t2Name = tank('hTank2Name');
            if(t2Name && val('hTank2Add')) text += `${val('hTank2Add')} MT added to ${t2Name} now containing ${val('hTank2Total')} MT\n`;
            
            text += `signed: (Officer-in-charge, Name & Rank) ${val('hOfficer')} ${dateStr}`;
            return showOrbResult(text);
        }
        else if(code === 'H_LUBE') {
            text = `Date: ${dateStr}\nCode: H\n\n`;
            text += `26.1 ${val('hPort')}\n`;
            text += `26.2 Start ${dateStr}-${val('hStart')} Stop ${dateStr}-${val('hStop')}\n`;
            text += `26.4 ${val('hQty')} MT ${val('hType')} bunkered in tanks:\n`;
            
            const t1Name = tank('hTank1Name');
            if(t1Name) text += `${val('hTank1Add')} MT added to ${t1Name} now containing ${val('hTank1Total')} MT\n`;
            
            text += `signed: (Officer-in-charge, Name & Rank) ${val('hOfficer')} ${dateStr}`;
            return showOrbResult(text);
        }

        // Добавляем подпись для остальных кодов
        text += `\nSigned: (Officer-in-charge, Name & Rank) ${dateStr}`;
        
        showOrbResult(text);
    };

    function showOrbResult(text) {
        document.getElementById('resOrb').innerText = text;
        document.getElementById('resOrb').style.display = 'block';
        document.getElementById('btnCopyOrb').style.display = 'block';
        document.getElementById('btnSaveOrb').style.display = 'block';
        document.getElementById('btnExportOrb').style.display = 'block';
    }

    // === ORB HISTORY ===
    let orbHistory = JSON.parse(localStorage.getItem('orb_history')) || [];

    function renderOrbHistory() {
        const box = document.getElementById('orbHistory');
        if(!box) return;
        if(orbHistory.length === 0) {
            box.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">No entries yet.</div>';
            return;
        }
        
        box.innerHTML = orbHistory.slice().reverse().map((h, idx) => {
            const realIdx = orbHistory.length - 1 - idx;
            return `
                <div class="tank-list-item" style="align-items:flex-start; flex-direction:column; gap:8px; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; margin-bottom: 8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:8px; border-bottom:1px solid var(--border); padding-bottom:6px;">
                        <div style="font-weight:600; font-size:0.85rem; color:var(--yellow);">${h.code} — ${h.date}</div>
                        <div style="display:flex; gap:6px;">
                            <button class="btn" style="margin-top:0; padding:4px 8px; font-size:0.7rem; background:var(--accent); color:#000;" onclick="editOrbHistory(${realIdx})">✏️ Edit</button>
                            <button class="btn-danger" style="padding:4px 8px; font-size:0.7rem;" onclick="deleteOrbHistory(${realIdx})">Del</button>
                        </div>
                    </div>
                    
                    <div id="hist-container-${realIdx}" style="width:100%;">
                        <div id="hist-text-${realIdx}" style="font-family:monospace; font-size:0.75rem; color:var(--text); white-space:pre-wrap; background:var(--bg); padding:8px; border-radius:6px; border:1px solid var(--border); line-height:1.5;">${h.text}</div>
                    </div>

                    <button class="btn" style="margin-top:0; padding:8px; font-size:0.75rem; width:100%; background:var(--green); color:#000;" onclick="copyOrbHistory(${realIdx})">📋 Copy to ORB</button>
                </div>
            `;
        }).join('');
    }

    window.editOrbHistory = function(i) {
        const container = document.getElementById('hist-container-' + i);
        const currentText = orbHistory[i].text;
        
        container.innerHTML = `
            <textarea id="edit-ta-${i}" style="width:100%; min-height:150px; font-family:monospace; font-size:0.75rem; margin-bottom:8px; background:var(--card); border:1px solid var(--yellow); color:var(--text); padding:8px; border-radius:6px;">${currentText}</textarea>
            <div style="display:flex; gap:8px;">
                <button class="btn" style="margin-top:0; padding:8px; font-size:0.75rem; background:var(--green); color:#000;" onclick="saveOrbHistoryEdit(${i})">💾 Save</button>
                <button class="btn" style="margin-top:0; padding:8px; font-size:0.75rem; background:var(--border); color:var(--text);" onclick="renderOrbHistory()">Cancel</button>
            </div>
        `;
    };

    window.saveOrbHistoryEdit = function(i) {
        const newText = document.getElementById('edit-ta-' + i).value;
        if(!newText.trim()) { alert('Текст не может быть пустым'); return; }
        
        orbHistory[i].text = newText;
        localStorage.setItem('orb_history', JSON.stringify(orbHistory));
        renderOrbHistory();
    };

    window.deleteOrbHistory = function(i) {
        if(!confirm('Delete this entry?')) return;
        orbHistory.splice(i, 1);
        localStorage.setItem('orb_history', JSON.stringify(orbHistory));
        renderOrbHistory();
    };

    window.copyOrbHistory = function(i) {
        navigator.clipboard.writeText(orbHistory[i].text).then(() => alert('Copied!'));
    };

    document.getElementById('btnSaveOrb').onclick = () => {
        const text = document.getElementById('resOrb').innerText;
        if(!text) return;
        const code = document.getElementById('orbCodeSelect').value;
        const date = formatDate(document.getElementById('chgDate').value);
        orbHistory.push({ code: code, date: date, text: text, ts: Date.now() });
        localStorage.setItem('orb_history', JSON.stringify(orbHistory));
        renderOrbHistory();
        const b = document.getElementById('btnSaveOrb');
        b.textContent = '✅ Saved';
        setTimeout(() => { b.textContent = '💾 Save to History'; }, 2000);
    };

    document.getElementById('btnExportOrb').onclick = () => {
        const text = document.getElementById('resOrb').innerText;
        if(!text) return;
        const code = document.getElementById('orbCodeSelect').value;
        const date = formatDate(document.getElementById('chgDate').value);
        const csv = 'Code,Date,Entry\n' + `"${code}","${date}","${text.replace(/"/g, '""')}"`;
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ORB_${code}_${date}.csv`;
        link.click();
    };

    document.getElementById('btnExportAll').onclick = () => {
        if(orbHistory.length === 0) { alert('History is empty'); return; }
        let csv = 'Code,Date,SavedAt,Entry\n';
        orbHistory.forEach(h => {
            const saved = new Date(h.ts).toISOString();
            csv += `"${h.code}","${h.date}","${saved}","${h.text.replace(/"/g, '""')}"\n`;
        });
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const today = new Date().toISOString().slice(0, 10);
        link.download = `ORB_History_${today}.csv`;
        link.click();
    };

    document.getElementById('btnClearAllOrb').onclick = () => {
        if(orbHistory.length === 0) { alert('History is already empty'); return; }
        const confirmDelete = confirm('Вы уверены, что хотите УДАЛИТЬ ВСЮ историю записей ORB? Это действие нельзя отменить.\n\n(Совет: перед удалением сделайте Export All в CSV, если записи нужны для отчетности).');
        if(confirmDelete) {
            orbHistory = [];
            localStorage.setItem('orb_history', JSON.stringify(orbHistory));
            renderOrbHistory();
        }
    };

    // === FUEL CALC ===
    const densityTable = [
        { min: 0.810, max: 0.813, vcf: 0.00091 },
        { min: 0.814, max: 0.817, vcf: 0.00090 },
        { min: 0.818, max: 0.823, vcf: 0.00088 },
        { min: 0.824, max: 0.828, vcf: 0.00087 },
        { min: 0.829, max: 0.833, vcf: 0.00086 },
        { min: 0.834, max: 0.838, vcf: 0.00085 },
        { min: 0.839, max: 0.848, vcf: 0.00084 },
        { min: 0.849, max: 0.854, vcf: 0.00083 },
        { min: 0.855, max: 0.859, vcf: 0.00082 },
        { min: 0.860, max: 0.876, vcf: 0.00081 },
        { min: 0.877, max: 0.882, vcf: 0.00080 },
        { min: 0.883, max: 0.893, vcf: 0.00079 },
        { min: 0.894, max: 0.902, vcf: 0.00078 },
        { min: 0.903, max: 0.912, vcf: 0.00077 },
        { min: 0.913, max: 0.925, vcf: 0.00075 },
        { min: 0.926, max: 0.937, vcf: 0.00074 },
        { min: 0.938, max: 0.955, vcf: 0.00072 },
        { min: 0.956, max: 0.970, vcf: 0.00071 },
        { min: 0.971, max: 0.982, vcf: 0.00070 },
        { min: 0.983, max: 0.997, vcf: 0.00068 },
        { min: 0.998, max: 1.015, vcf: 0.00067 },
        { min: 1.016, max: 1.020, vcf: 0.00066 },
        { min: 1.021, max: 1.030, vcf: 0.00065 }
    ];

    function getVcf(density) {
        const row = densityTable.find(r => density >= r.min && density <= r.max);
        return row ? row.vcf : null;
    }

    document.getElementById('btnCalcVcf').onclick = () => {
        const density = parseFloat(document.getElementById('fcDensity').value);
        const temp = parseFloat(document.getElementById('fcTemp').value);
        const volume = parseFloat(document.getElementById('fcVolume').value);
        if(isNaN(density) || isNaN(temp) || isNaN(volume)) { alert('Fill all fields'); return; }
        const vcf = getVcf(density);
        if(!vcf) { alert('Density out of range (0.810–1.030)'); return; }
        const corrected = volume - vcf * (temp - 15);
        document.getElementById('fcVcf').value = vcf.toFixed(5);
        const res = document.getElementById('resFuel');
        res.style.display = 'block';
        res.innerText =
            `Density @ 15°C: ${density.toFixed(4)} g/cm³\n` +
            `VCF (coefficient): ${vcf.toFixed(5)}\n` +
            `Observed Volume: ${volume.toFixed(2)} m³\n` +
            `Temperature: ${temp.toFixed(1)}°C\n` +
            `Corrected Volume @ 15°C: ${corrected.toFixed(3)} m³`;
    };

    document.getElementById('btnCalcCons').onclick = () => {
        const line = document.getElementById('fcLine').value;
        const start = parseFloat(document.getElementById('fcStart').value);
        const end = parseFloat(document.getElementById('fcEnd').value);
        const density = parseFloat(document.getElementById('fcD2').value);
        const temp = parseFloat(document.getElementById('fcT2').value);
        if(isNaN(start) || isNaN(end) || isNaN(density) || isNaN(temp)) { alert('Fill all fields'); return; }
        if(end < start) { alert('End reading must be >= start'); return; }
        const vcf = getVcf(density);
        if(!vcf) { alert('Density out of range'); return; }
        const corrStart = start - vcf * (temp - 15);
        const corrEnd = end - vcf * (temp - 15);
        const consum = (corrEnd - corrStart) / 1000;
        const res = document.getElementById('resCons');
        res.style.display = 'block';
        res.innerText =
            `Line: ${line}\n` +
            `Start: ${start.toFixed(2)} → Corrected: ${corrStart.toFixed(3)}\n` +
            `End: ${end.toFixed(2)} → Corrected: ${corrEnd.toFixed(3)}\n` +
            `Consumption: ${consum.toFixed(3)} MT`;
    };

    // === DELIVERY CHECKLIST ===
    const DELIVERY_PREDEFINED = {
        dock: ['Main Engine','Aux Engines (1/2/3)','Boiler','Steering Gear','Fire Pumps','Emergency Generator','Lifeboat Davits','Hatches & Covers','Ballast System','Bilge System','Purifiers','Incinerator','Sewage Treatment','Fresh Water Generator','A/C & Refrigeration','Bow Thruster','Mooring Winches'],
        sea: ['MCR Full Speed Run','Fuel Consumption Measurement','Manoeuvring Tests','Anchoring Test','ECDIS','GMDSS','Autopilot','Steering Changeover','Emergency Steering','Blackout Recovery','Crash Stop'],
        docs: ['IOPP Certificate','ORB','BWRB','Garbage Record Book','ISM (SMC + DOC)','ISPS Certificate','MLC Certificate','Class Certs (Hull/Machinery)','Load Line','Tonnage Certificate','Safety Equipment Certificate','Radio License','Minimum Manning Document','CSR','IHM','CoF']
    };
    const SECTION_LABELS = { dock: 'Dock Trial', sea: 'Sea Trial', docs: 'Documents' };

    let deliveryItems = JSON.parse(localStorage.getItem('el_delivery_items')) || [];
    if(deliveryItems.length === 0) {
        Object.entries(DELIVERY_PREDEFINED).forEach(([section, arr]) => {
            arr.forEach((text, i) => deliveryItems.push({ id: 'd_' + section + '_' + i, section, text, checked: false, note: '', custom: false }));
        });
        localStorage.setItem('el_delivery_items', JSON.stringify(deliveryItems));
    }

    function renderDelivery() {
        const box = document.getElementById('deliverySections');
        if(!box) return;
        box.innerHTML = Object.keys(SECTION_LABELS).map(section => {
            const items = deliveryItems.filter(i => i.section === section);
            const done = items.filter(i => i.checked).length;
            return `
                <details open style="margin-bottom:15px;">
                    <summary style="cursor:pointer; font-weight:600; font-size:0.85rem; color:var(--accent); padding:6px 0;">${SECTION_LABELS[section]} (<span data-counter="${section}">${done}/${items.length}</span>)</summary>
                    <div style="margin-top:8px;">
                        ${items.map(item => `
                            <div style="padding:8px 0; border-bottom:1px solid var(--border);">
                                <div style="display:flex; align-items:flex-start; gap:10px;">
                                    <input type="checkbox" data-did="${item.id}" ${item.checked ? 'checked' : ''} onchange="toggleDelivery('${item.id}', this)" style="margin-top:2px;">
                                    <div style="flex:1; font-size:0.85rem; line-height:1.4; word-break:break-word;">${item.text}</div>
                                    ${item.custom ? `<button class="btn-danger" onclick="deleteDeliveryItem('${item.id}')" style="padding:4px 8px; font-size:0.7rem; flex:0 0 auto;">Del</button>` : ''}
                                </div>
                                <input type="text" placeholder="Note..." value="${(item.note || '').replace(/"/g, '&quot;')}" onchange="updateDeliveryNote('${item.id}', this.value)" style="width:100%; margin-top:6px; padding:6px; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:6px; font-size:0.75rem;">
                            </div>
                        `).join('')}
                    </div>
                </details>
            `;
        }).join('');
    }

    window.toggleDelivery = function(id, el) {
        const item = deliveryItems.find(i => i.id === id);
        if(!item) return;
        item.checked = el.checked;
        localStorage.setItem('el_delivery_items', JSON.stringify(deliveryItems));
        const items = deliveryItems.filter(i => i.section === item.section);
        const done = items.filter(i => i.checked).length;
        const counter = document.querySelector(`[data-counter="${item.section}"]`);
        if(counter) counter.textContent = `${done}/${items.length}`;
    };

    window.updateDeliveryNote = function(id, val) {
        const item = deliveryItems.find(i => i.id === id);
        if(!item) return;
        item.note = val;
        localStorage.setItem('el_delivery_items', JSON.stringify(deliveryItems));
    };

    window.deleteDeliveryItem = function(id) {
        if(!confirm('Delete this item?')) return;
        deliveryItems = deliveryItems.filter(i => i.id !== id);
        localStorage.setItem('el_delivery_items', JSON.stringify(deliveryItems));
        renderDelivery();
    };

    document.getElementById('btnAddDeliveryItem').onclick = () => {
        const text = document.getElementById('newDeliveryItem').value.trim();
        const section = document.getElementById('newDeliverySection').value;
        if(!text) { alert('Enter item text'); return; }
        deliveryItems.push({ id: 'd_c_' + Date.now(), section, text, checked: false, note: '', custom: true });
        localStorage.setItem('el_delivery_items', JSON.stringify(deliveryItems));
        document.getElementById('newDeliveryItem').value = '';
        renderDelivery();
    };

    // === PUNCH LIST ===
    let punchList = JSON.parse(localStorage.getItem('el_punch_list')) || [];

    function renderPunchList() {
        const box = document.getElementById('punchList');
        if(!box) return;
        if(punchList.length === 0) {
            box.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">No defects recorded.</div>';
            return;
        }
        box.innerHTML = punchList.slice().reverse().map(p => {
            const sevColor = p.severity === 'Critical' ? 'var(--red)' : p.severity === 'Major' ? 'var(--yellow)' : 'var(--text-muted)';
            return `
                <div class="tank-list-item" style="flex-direction:column; align-items:stretch; gap:6px;">
                    <div style="display:flex; justify-content:space-between; gap:8px;">
                        <div style="font-weight:600; font-size:0.85rem;">${p.item}</div>
                        <button class="btn-danger" onclick="deletePunch('${p.id}')">Del</button>
                    </div>
                    <div style="font-size:0.75rem; color:${sevColor};">${p.severity} • ${p.status}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${p.location || '-'} • ${p.who || '-'}</div>
                    <div style="font-size:0.8rem;">${p.description || ''}</div>
                </div>
            `;
        }).join('');
    }

    window.deletePunch = function(id) {
        if(!confirm('Delete?')) return;
        punchList = punchList.filter(p => p.id !== id);
        localStorage.setItem('el_punch_list', JSON.stringify(punchList));
        renderPunchList();
    };

    document.getElementById('btnAddPunch').onclick = () => {
        const item = document.getElementById('plItem').value.trim();
        if(!item) { alert('Enter item name'); return; }
        punchList.push({
            id: 'p_' + Date.now(),
            item,
            location: document.getElementById('plLocation').value.trim(),
            description: document.getElementById('plDescription').value.trim(),
            severity: document.getElementById('plSeverity').value,
            status: document.getElementById('plStatus').value,
            who: document.getElementById('plWho').value.trim()
        });
        localStorage.setItem('el_punch_list', JSON.stringify(punchList));
        ['plItem','plLocation','plDescription','plWho'].forEach(id => document.getElementById(id).value = '');
        renderPunchList();
    };

    document.getElementById('btnExportPunch').onclick = () => {
        if(punchList.length === 0) { alert('Punch list is empty'); return; }
        let csv = 'Item,Location,Description,Severity,Status,Responsible\n';
        punchList.forEach(p => {
            csv += `"${(p.item||'').replace(/"/g,'""')}","${(p.location||'').replace(/"/g,'""')}","${(p.description||'').replace(/"/g,'""')}","${p.severity}","${p.status}","${(p.who||'').replace(/"/g,'""')}"\n`;
        });
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `PunchList_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
    };

    // === INVENTORY ===
    let inventoryItems = JSON.parse(localStorage.getItem('el_inventory_items')) || [];
    let invFilter = 'all';

    function renderInventory() {
        const box = document.getElementById('invList');
        if(!box) return;
        let filtered = inventoryItems;
        if(invFilter === 'below') filtered = inventoryItems.filter(i => (i.onBoard + i.ordered) < i.min);
        else if(invFilter === 'critical') filtered = inventoryItems.filter(i => i.critical);
        else if(invFilter !== 'all') filtered = inventoryItems.filter(i => i.category === invFilter);

        if(filtered.length === 0) {
            box.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">No items.</div>';
            return;
        }
        box.innerHTML = filtered.map(i => {
            const below = (i.onBoard + i.ordered) < i.min;
            return `
                <div class="tank-list-item" style="flex-direction:column; align-items:stretch; gap:6px;">
                    <div style="display:flex; justify-content:space-between; gap:8px;">
                        <div style="font-weight:600; font-size:0.85rem;">${i.name} ${i.critical ? '<span class="inv-critical-star">★</span>' : ''}</div>
                        <button class="btn-danger" onclick="deleteInvItem('${i.id}')">Del</button>
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${i.category} • ${i.maker || '-'} • ${i.part || '-'} • ${i.location || '-'}</div>
                    <div style="font-size:0.8rem;" class="${below ? 'inv-warning' : ''}">On board: ${i.onBoard} | Min: ${i.min} | Ordered: ${i.ordered} ${below ? '⚠️ BELOW MIN' : ''}</div>
                </div>
            `;
        }).join('');
    }

    document.getElementById('invFilter').onchange = function() {
        invFilter = this.value;
        renderInventory();
    };

    window.deleteInvItem = function(id) {
        if(!confirm('Delete item?')) return;
        inventoryItems = inventoryItems.filter(i => i.id !== id);
        localStorage.setItem('el_inventory_items', JSON.stringify(inventoryItems));
        renderInventory();
        renderReqInvPicker();
    };

    document.getElementById('btnAddInv').onclick = () => {
        const name = document.getElementById('newInvName').value.trim();
        if(!name) { alert('Enter item name'); return; }
        inventoryItems.push({
            id: 'i_' + Date.now(),
            name,
            maker: document.getElementById('newInvMaker').value.trim(),
            part: document.getElementById('newInvPart').value.trim(),
            location: document.getElementById('newInvLocation').value.trim(),
            category: document.getElementById('newInvCategory').value,
            onBoard: parseFloat(document.getElementById('newInvOnBoard').value) || 0,
            min: parseFloat(document.getElementById('newInvMin').value) || 0,
            ordered: parseFloat(document.getElementById('newInvOrdered').value) || 0,
            critical: document.getElementById('newInvCritical').value === 'yes'
        });
        localStorage.setItem('el_inventory_items', JSON.stringify(inventoryItems));
        ['newInvName','newInvMaker','newInvPart','newInvLocation'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('newInvOnBoard').value = 0;
        document.getElementById('newInvMin').value = 1;
        document.getElementById('newInvOrdered').value = 0;
        renderInventory();
        renderReqInvPicker();
    };

    // === REQUISITION ===
    let reqDraft = JSON.parse(localStorage.getItem('el_requisition_draft')) || {
        vessel: '', port: '', agent: '', date: new Date().toISOString().slice(0,10), urgency: 'Routine', remarks: '', rows: []
    };

    function saveReqDraft() { localStorage.setItem('el_requisition_draft', JSON.stringify(reqDraft)); }

    function renderReqHeader() {
        document.getElementById('reqVessel').value = reqDraft.vessel;
        document.getElementById('reqPort').value = reqDraft.port;
        document.getElementById('reqAgent').value = reqDraft.agent;
        document.getElementById('reqDate').value = reqDraft.date;
        document.getElementById('reqUrgency').value = reqDraft.urgency;
        document.getElementById('reqRemarks').value = reqDraft.remarks;
    }

    function renderReqRows() {
        const box = document.getElementById('reqRows');
        if(!box) return;
        if(reqDraft.rows.length === 0) {
            box.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">No rows added.</div>';
            return;
        }
        box.innerHTML = reqDraft.rows.map(r => `
            <div class="tank-list-item" style="flex-direction:column; align-items:stretch; gap:4px;">
                <div style="display:flex; justify-content:space-between; gap:8px;">
                    <div style="font-weight:600; font-size:0.85rem;">${r.name}</div>
                    <button class="btn-danger" onclick="deleteReqRow('${r.id}')">Del</button>
                </div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${r.maker || '-'} • ${r.part || '-'} • Qty: ${r.qty} ${r.unit || ''}</div>
                ${r.remarks ? `<div style="font-size:0.75rem;">${r.remarks}</div>` : ''}
            </div>
        `).join('');
    }

    function renderReqInvPicker() {
        const box = document.getElementById('reqInvPicker');
        if(!box) return;
        const below = inventoryItems.filter(i => (i.onBoard + i.ordered) < i.min);
        if(below.length === 0) {
            box.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">No items below minimum.</div>';
            return;
        }
        box.innerHTML = below.map(i => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid var(--border);">
                <div style="font-size:0.8rem;">${i.name} (${i.onBoard}/${i.min})${i.critical ? ' ★' : ''}</div>
                <button class="btn" style="margin-top:0; padding:6px 10px; font-size:0.75rem; width:auto;" onclick="addReqFromInv('${i.id}')">+ Add</button>
            </div>
        `).join('');
    }

    function renderReqAll() {
        renderReqHeader();
        renderReqRows();
        renderReqInvPicker();
    }

    window.deleteReqRow = function(id) {
        reqDraft.rows = reqDraft.rows.filter(r => r.id !== id);
        saveReqDraft();
        renderReqRows();
    };

    window.addReqFromInv = function(invId) {
        const inv = inventoryItems.find(i => i.id === invId);
        if(!inv) return;
        const need = Math.max(inv.min - inv.onBoard - inv.ordered, 1);
        reqDraft.rows.push({
            id: 'r_' + Date.now(),
            name: inv.name,
            maker: inv.maker || '',
            part: inv.part || '',
            qty: need,
            unit: 'pcs',
            remarks: `Below min (on board ${inv.onBoard}, min ${inv.min})`,
            inventoryId: inv.id
        });
        saveReqDraft();
        renderReqRows();
    };

    ['reqVessel','reqPort','reqAgent','reqDate','reqUrgency','reqRemarks'].forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        el.oninput = el.onchange = function() {
            const map = { reqVessel:'vessel', reqPort:'port', reqAgent:'agent', reqDate:'date', reqUrgency:'urgency', reqRemarks:'remarks' };
            reqDraft[map[id]] = this.value;
            saveReqDraft();
        };
    });

    document.getElementById('btnAddReqRow').onclick = () => {
        const name = document.getElementById('newReqName').value.trim();
        if(!name) { alert('Enter item name'); return; }
        reqDraft.rows.push({
            id: 'r_' + Date.now(),
            name,
            maker: document.getElementById('newReqMaker').value.trim(),
            part: document.getElementById('newReqPart').value.trim(),
            qty: parseFloat(document.getElementById('newReqQty').value) || 1,
            unit: document.getElementById('newReqUnit').value.trim(),
            remarks: document.getElementById('newReqRemarks').value.trim()
        });
        saveReqDraft();
        ['newReqName','newReqMaker','newReqPart','newReqUnit','newReqRemarks'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('newReqQty').value = 1;
        renderReqRows();
    };

    document.getElementById('btnReqExport').onclick = () => {
        if(reqDraft.rows.length === 0) { alert('No rows to export'); return; }
        let csv = 'Vessel,Port,Agent,Date,Urgency,Remarks\n';
        csv += `"${reqDraft.vessel}","${reqDraft.port}","${reqDraft.agent}","${reqDraft.date}","${reqDraft.urgency}","${(reqDraft.remarks||'').replace(/"/g,'""')}"\n\n`;
        csv += 'Name,Maker,Part No.,Qty,Unit,Remarks\n';
        reqDraft.rows.forEach(r => {
            csv += `"${(r.name||'').replace(/"/g,'""')}","${(r.maker||'').replace(/"/g,'""')}","${(r.part||'').replace(/"/g,'""')}","${r.qty}","${(r.unit||'').replace(/"/g,'""')}","${(r.remarks||'').replace(/"/g,'""')}"\n`;
        });
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Requisition_${reqDraft.date}.csv`;
        link.click();
    };

    document.getElementById('btnReqCopy').onclick = () => {
        if(reqDraft.rows.length === 0) { alert('No rows to copy'); return; }
        let txt = `REQUISITION\n`;
        txt += `Vessel: ${reqDraft.vessel || '-'}\nPort: ${reqDraft.port || '-'}\nAgent: ${reqDraft.agent || '-'}\nDate: ${reqDraft.date}\nUrgency: ${reqDraft.urgency}\n`;
        if(reqDraft.remarks) txt += `Remarks: ${reqDraft.remarks}\n`;
        txt += `\n--- ITEMS ---\n`;
        reqDraft.rows.forEach((r, i) => {
            txt += `${i+1}. ${r.name}`;
            if(r.maker) txt += ` | Maker: ${r.maker}`;
            if(r.part) txt += ` | P/N: ${r.part}`;
            txt += ` | Qty: ${r.qty} ${r.unit || ''}`;
            if(r.remarks) txt += ` | ${r.remarks}`;
            txt += `\n`;
        });
        navigator.clipboard.writeText(txt).then(() => {
            const b = document.getElementById('btnReqCopy');
            b.textContent = '✅ Copied!';
            setTimeout(() => { b.textContent = '📋 Copy Text'; }, 2000);
        });
    };

    document.getElementById('btnReqClear').onclick = () => {
        if(!confirm('Clear entire requisition draft? (Inventory untouched)')) return;
        reqDraft = { vessel: '', port: '', agent: '', date: new Date().toISOString().slice(0,10), urgency: 'Routine', remarks: '', rows: [] };
        saveReqDraft();
        renderReqAll();
    };

    // === SUB-TABS BINDING (Spares) ===
    document.querySelectorAll('.sub-tab-btn[data-sub]').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.sub-tab-btn[data-sub]').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.sub-content').forEach(c => c.style.display = 'none');
            btn.classList.add('active');
            document.getElementById('sub-' + btn.dataset.sub).style.display = 'block';
        };
    });

    // === WARRANTY ===
    let warrantyItems = JSON.parse(localStorage.getItem('el_warranty_items')) || [];

    function renderWarranty() {
        const box = document.getElementById('warrantyList');
        if(!box) return;
        if(warrantyItems.length === 0) {
            box.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">No warranty claims.</div>';
            return;
        }
        box.innerHTML = warrantyItems.slice().reverse().map(w => {
            let days = null;
            if(w.expiry) {
                days = Math.ceil((new Date(w.expiry) - new Date()) / (1000*60*60*24));
            }
            const daysColor = days !== null && days < 30 ? 'var(--red)' : 'var(--text-muted)';
            const statusColor = w.status === 'Resolved' ? 'var(--green)' : w.status === 'Rejected' ? 'var(--red)' : w.status === 'Claimed' ? 'var(--yellow)' : 'var(--text-muted)';
            return `
                <div class="tank-list-item" style="flex-direction:column; align-items:stretch; gap:6px;">
                    <div style="display:flex; justify-content:space-between; gap:8px;">
                        <div style="font-weight:600; font-size:0.85rem;">${w.item}</div>
                        <button class="btn-danger" onclick="deleteWarranty('${w.id}')">Del</button>
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${w.system} • ${w.maker || '-'} • Failure: ${w.dateFail || '-'}</div>
                    <div style="font-size:0.75rem; color:${statusColor};">Status: ${w.status}${w.refNo ? ' • Ref: ' + w.refNo : ''}</div>
                    ${days !== null ? `<div style="font-size:0.75rem; color:${daysColor};">Expiry: ${w.expiry} (${days >= 0 ? days + ' days left' : Math.abs(days) + ' days overdue'})</div>` : ''}
                    ${w.description ? `<div style="font-size:0.8rem;">${w.description}</div>` : ''}
                    ${w.notes ? `<div style="font-size:0.75rem; color:var(--text-muted);">${w.notes}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    window.deleteWarranty = function(id) {
        if(!confirm('Delete claim?')) return;
        warrantyItems = warrantyItems.filter(w => w.id !== id);
        localStorage.setItem('el_warranty_items', JSON.stringify(warrantyItems));
        renderWarranty();
    };

    document.getElementById('btnAddWarranty').onclick = () => {
        const item = document.getElementById('wItem').value.trim();
        if(!item) { alert('Enter item'); return; }
        warrantyItems.push({
            id: 'w_' + Date.now(),
            item,
            maker: document.getElementById('wMaker').value.trim(),
            system: document.getElementById('wSystem').value,
            description: document.getElementById('wDescription').value.trim(),
            dateFail: document.getElementById('wDateFail').value,
            dateClaimed: document.getElementById('wDateClaimed').value,
            refNo: document.getElementById('wRefNo').value.trim(),
            expiry: document.getElementById('wExpiry').value,
            status: document.getElementById('wStatus').value,
            notes: document.getElementById('wNotes').value.trim()
        });
        localStorage.setItem('el_warranty_items', JSON.stringify(warrantyItems));
        ['wItem','wMaker','wDescription','wDateFail','wDateClaimed','wRefNo','wExpiry','wNotes'].forEach(id => document.getElementById(id).value = '');
        renderWarranty();
    };

    document.getElementById('btnExportWarranty').onclick = () => {
        if(warrantyItems.length === 0) { alert('No claims to export'); return; }
        let csv = 'Item,Maker,System,Description,Date of Failure,Date Claimed,Ref No.,Expiry,Status,Notes\n';
        warrantyItems.forEach(w => {
            csv += `"${(w.item||'').replace(/"/g,'""')}","${(w.maker||'').replace(/"/g,'""')}","${w.system}","${(w.description||'').replace(/"/g,'""')}","${w.dateFail||''}","${w.dateClaimed||''}","${(w.refNo||'').replace(/"/g,'""')}","${w.expiry||''}","${w.status}","${(w.notes||'').replace(/"/g,'""')}"\n`;
        });
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Warranty_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
    };

    // === NOTES ===
    let notesItems = JSON.parse(localStorage.getItem('el_notes_items')) || [];
    let noteFilter = 'all';
    let noteSearchTerm = '';

    const NOTE_ICONS = { Inspector: '🔍', Superintendent: '👔', PhonePrep: '📞', Task: '✅', General: '📝' };

    function renderNotes() {
        const box = document.getElementById('notesList');
        if(!box) return;
        let filtered = notesItems;
        if(noteFilter === 'open') filtered = filtered.filter(n => !n.done);
        else if(noteFilter === 'done') filtered = filtered.filter(n => n.done);
        else if(noteFilter !== 'all') filtered = filtered.filter(n => n.category === noteFilter);
        if(noteSearchTerm) {
            const t = noteSearchTerm.toLowerCase();
            filtered = filtered.filter(n => (n.title||'').toLowerCase().includes(t) || (n.body||'').toLowerCase().includes(t));
        }

        filtered = filtered.slice().sort((a, b) => {
            if(a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return b.ts - a.ts;
        });

        if(filtered.length === 0) {
            box.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">No notes.</div>';
            return;
        }

        box.innerHTML = filtered.map(n => {
            const icon = NOTE_ICONS[n.category] || '📝';
            const dateStr = new Date(n.ts).toISOString().slice(0, 16).replace('T', ' ');
            return `
                <div class="tank-list-item" style="flex-direction:column; align-items:stretch; gap:6px; ${n.done ? 'opacity:0.55;' : ''}">
                    <div style="display:flex; justify-content:space-between; gap:8px; align-items:flex-start;">
                        <div style="flex:1;">
                            <div style="font-weight:600; font-size:0.85rem; ${n.done ? 'text-decoration:line-through;' : ''}">${n.pinned ? '📌 ' : ''}${icon} ${n.title || '(no title)'}</div>
                            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${n.category} • ${dateStr}</div>
                        </div>
                        <div style="display:flex; gap:4px; flex-wrap:wrap;">
                            <button class="btn-danger" style="padding:4px 8px; font-size:0.7rem;" onclick="toggleNoteDone('${n.id}')">${n.done ? '↩️' : '✓'}</button>
                            <button class="btn-danger" style="padding:4px 8px; font-size:0.7rem;" onclick="toggleNotePin('${n.id}')">${n.pinned ? '📍' : '📌'}</button>
                            <button class="btn-danger" style="padding:4px 8px; font-size:0.7rem;" onclick="deleteNote('${n.id}')">Del</button>
                        </div>
                    </div>
                    ${n.body ? `<div style="font-size:0.8rem; white-space:pre-wrap; margin-top:4px;">${n.body}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    window.toggleNoteDone = function(id) {
        const n = notesItems.find(x => x.id === id);
        if(!n) return;
        n.done = !n.done;
        localStorage.setItem('el_notes_items', JSON.stringify(notesItems));
        renderNotes();
    };

    window.toggleNotePin = function(id) {
        const n = notesItems.find(x => x.id === id);
        if(!n) return;
        n.pinned = !n.pinned;
        localStorage.setItem('el_notes_items', JSON.stringify(notesItems));
        renderNotes();
    };

    window.deleteNote = function(id) {
        if(!confirm('Delete this note?')) return;
        notesItems = notesItems.filter(n => n.id !== id);
        localStorage.setItem('el_notes_items', JSON.stringify(notesItems));
        renderNotes();
    };

    document.getElementById('btnAddNote').onclick = () => {
        const title = document.getElementById('noteTitle').value.trim();
        const body = document.getElementById('noteBody').value.trim();
        if(!title && !body) { alert('Enter title or body'); return; }
        notesItems.push({
            id: 'n_' + Date.now(),
            title,
            body,
            category: document.getElementById('noteCategory').value,
            pinned: document.getElementById('notePinned').value === 'yes',
            done: false,
            ts: Date.now()
        });
        localStorage.setItem('el_notes_items', JSON.stringify(notesItems));
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteBody').value = '';
        document.getElementById('notePinned').value = 'no';
        renderNotes();
    };

    document.getElementById('noteFilter').onchange = function() {
        noteFilter = this.value;
        renderNotes();
    };

    document.getElementById('noteSearch').oninput = function() {
        noteSearchTerm = this.value;
        renderNotes();
    };

    document.getElementById('btnExportNotes').onclick = () => {
        if(notesItems.length === 0) { alert('No notes to export'); return; }
        let csv = 'Date,Category,Pinned,Done,Title,Body\n';
        notesItems.slice().sort((a,b) => a.ts - b.ts).forEach(n => {
            const d = new Date(n.ts).toISOString();
            csv += `"${d}","${n.category}","${n.pinned ? 'Yes' : 'No'}","${n.done ? 'Yes' : 'No'}","${(n.title||'').replace(/"/g,'""')}","${(n.body||'').replace(/"/g,'""')}"\n`;
        });
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Notes_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
    };

    // === BUNKERING CHECKLIST ===
    const BUNKER_PREDEFINED = [
        'Communications established with supplier (VHF/UHF)',
        'Bunkering plan agreed and signed by both parties',
        'Emergency shutdown procedure discussed',
        'Drip trays in place and empty',
        'Scuppers plugged',
        'Firefighting equipment ready (extinguishers, sand)',
        'Sampling procedure agreed (drip sample)',
        'Personnel stationed at manifold',
        'Hose/loading arm connected, pressure tested',
        'Tank levels checked before start'
    ];

    let bunkerItems = JSON.parse(localStorage.getItem('el_bunker_items')) || [];
    if(bunkerItems.length === 0) {
        bunkerItems = BUNKER_PREDEFINED.map((text, i) => ({ id: 'b_' + i, text, checked: false }));
        localStorage.setItem('el_bunker_items', JSON.stringify(bunkerItems));
    }

    function renderBunkerChecklist() {
        const box = document.getElementById('bunkerChecklist');
        if(!box) return;
        box.innerHTML = bunkerItems.map(item => `
            <div style="padding:8px 0; border-bottom:1px solid var(--border); display:flex; align-items:flex-start; gap:10px;">
                <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleBunker('${item.id}', this)" style="margin-top:2px;">
                <div style="flex:1; font-size:0.85rem; line-height:1.4;">${item.text}</div>
                <button class="btn-danger" onclick="deleteBunkerItem('${item.id}')" style="padding:2px 6px; font-size:0.7rem; flex:0 0 auto;">Del</button>
            </div>
        `).join('');
    }

    window.deleteBunkerItem = function(id) {
        if(!confirm('Удалить пункт?')) return;
        bunkerItems = bunkerItems.filter(i => i.id !== id);
        localStorage.setItem('el_bunker_items', JSON.stringify(bunkerItems));
        renderBunkerChecklist();
    };

    document.getElementById('btnAddBunkerItem').onclick = () => {
        const text = document.getElementById('newBunkerItem').value.trim();
        if(!text) return;
        bunkerItems.push({ id: 'b_c_' + Date.now(), text, checked: false });
        localStorage.setItem('el_bunker_items', JSON.stringify(bunkerItems));
        document.getElementById('newBunkerItem').value = '';
        renderBunkerChecklist();
    };

    window.toggleBunker = function(id, el) {
        const item = bunkerItems.find(i => i.id === id);
        if(!item) return;
        item.checked = el.checked;
        localStorage.setItem('el_bunker_items', JSON.stringify(bunkerItems));
    };

    document.getElementById('btnResetBunker').onclick = () => {
        if(!confirm('Сбросить чек-лист?')) return;
        bunkerItems = BUNKER_PREDEFINED.map((text, i) => ({ id: 'b_' + i, text, checked: false }));
        localStorage.setItem('el_bunker_items', JSON.stringify(bunkerItems));
        renderBunkerChecklist();
    };

    // === LETTER OF PROTEST ===
    document.getElementById('lopDate').valueAsDate = new Date();

    document.getElementById('btnGenLop').onclick = () => {
        const date = formatDate(document.getElementById('lopDate').value);
        const time = document.getElementById('lopTime').value;
        const vessel = document.getElementById('lopVessel').value || '[VESSEL NAME]';
        const port = document.getElementById('lopPort').value || '[PORT]';
        const supplier = document.getElementById('lopSupplier').value || '[SUPPLIER]';
        const reason = document.getElementById('lopReason').value;
        const details = document.getElementById('lopDetails').value;

        let text = `LETTER OF PROTEST\n\n`;
        text += `Date: ${date}\nTime: ${time}\n`;
        text += `Vessel: ${vessel}\nPort: ${port}\n`;
        text += `To: ${supplier}\n\n`;
        
        text += `Dear Sirs,\n\n`;
        text += `This is to formally protest against the `;
        
        if(reason === 'Shortage') text += `shortage of bunker fuel delivered.`;
        else if(reason === 'Quality') text += `poor quality of bunker fuel delivered.`;
        else if(reason === 'Delay') text += `delay in delivery of bunker fuel.`;
        else text += `issue during bunkering operation.`;
        
        text += `\n\nDetails:\n${details}\n\n`;
        
        text += `We hold you responsible for any consequences arising from this issue. `;
        text += `This protest is made without prejudice to the rights of the Owners and Charterers.\n\n`;
        
        text += `Yours faithfully,\n`;
        text += `Master / Chief Engineer of ${vessel}`;

        document.getElementById('resLop').innerText = text;
        document.getElementById('resLop').style.display = 'block';
        document.getElementById('btnCopyLop').style.display = 'block';
    };

    // === NIGHT ORDER ===
    document.getElementById('noDate').valueAsDate = new Date();

    const NO_PREDEFINED = [
        { text: 'Monitor M/E parameters (Watch for abnormal noise, vibration, temperatures).', checked: true },
        { text: 'Check A/E and generators (Load, temperatures, fuel/oil pressure).', checked: true },
        { text: 'Monitor boiler water level and steam pressure.', checked: true },
        { text: 'Check operation of purifiers and fuel viscosity.', checked: true },
        { text: 'Monitor sludge tank levels and pump out if necessary.', checked: true },
        { text: 'Maintain bilge levels and check for water ingress.', checked: true },
        { text: 'Perform fire safety rounds.', checked: true }
    ];

    let noChecks = JSON.parse(localStorage.getItem('el_no_checks')) || [];
    if(noChecks.length === 0) {
        noChecks = NO_PREDEFINED.map((item, i) => ({ id: 'no_' + i, text: item.text, checked: item.checked }));
        localStorage.setItem('el_no_checks', JSON.stringify(noChecks));
    }

    function renderNoChecks() {
        const box = document.getElementById('nightOrderChecks');
        if(!box) return;
        box.innerHTML = noChecks.map(item => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:8px;">
                <label style="display:flex; gap:8px; color:var(--text); font-size:0.8rem; flex:1;">
                    <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleNoCheck('${item.id}', this)">
                    ${item.text}
                </label>
                <button class="btn-danger" onclick="deleteNoCheck('${item.id}')" style="padding:2px 6px; font-size:0.7rem;">Del</button>
            </div>
        `).join('');
    }

    window.toggleNoCheck = function(id, el) {
        const item = noChecks.find(i => i.id === id);
        if(item) item.checked = el.checked;
        localStorage.setItem('el_no_checks', JSON.stringify(noChecks));
    };

    window.deleteNoCheck = function(id) {
        if(!confirm('Удалить приказ?')) return;
        noChecks = noChecks.filter(i => i.id !== id);
        localStorage.setItem('el_no_checks', JSON.stringify(noChecks));
        renderNoChecks();
    };

    document.getElementById('btnAddNightOrderItem').onclick = () => {
        const text = document.getElementById('newNightOrderItem').value.trim();
        if(!text) return;
        noChecks.push({ id: 'no_c_' + Date.now(), text, checked: true });
        localStorage.setItem('el_no_checks', JSON.stringify(noChecks));
        document.getElementById('newNightOrderItem').value = '';
        renderNoChecks();
    };

    document.getElementById('btnGenNo').onclick = () => {
        const date = formatDate(document.getElementById('noDate').value);
        const pos = document.getElementById('noPos').value || 'N/A';
        const weather = document.getElementById('noWeather').value || 'N/A';
        const status = document.getElementById('noStatus').value;
        const extra = document.getElementById('noExtra').value.trim();

        let text = `NIGHT ORDER\nDate: ${date}\nPosition: ${pos}\nWeather: ${weather}\nStatus: ${status}\n\n`;
        text += `To the Duty Engineer:\n\n`;
        text += `Please pay special attention to the following during your watch:\n`;

        noChecks.forEach(item => {
            if(item.checked) {
                text += `- ${item.text}\n`;
            }
        });

        if(extra) {
            text += `\nAdditional Instructions:\n${extra}\n`;
        }

        text += `\nIn case of any abnormalities or emergencies, call the Chief Engineer immediately.\n\n`;
        text += `Signed: Chief Engineer`;

        document.getElementById('resNo').innerText = text;
        document.getElementById('resNo').style.display = 'block';
        document.getElementById('btnCopyNo').style.display = 'block';
    };

    // === LUBE OIL ===
    document.getElementById('btnCalcCyl').onclick = () => {
        const power = parseFloat(document.getElementById('coPower').value);
        const rate = parseFloat(document.getElementById('coRate').value);
        const hours = parseFloat(document.getElementById('coHours').value);
        const density = parseFloat(document.getElementById('coDensity').value) || 0.90;

        if(isNaN(power) || isNaN(rate) || isNaN(hours)) { alert('Заполни Мощность, Подачу и Часы'); return; }

        const kgPerDay = (power * rate * hours) / 1000;
        const litersPerDay = kgPerDay / density;

        const res = document.getElementById('resCyl');
        res.style.display = 'block';
        res.innerText = 
            `Engine Power: ${power} kW\n` +
            `Feed Rate: ${rate} g/kWh\n` +
            `Duration: ${hours} hours\n\n` +
            `Total Consumption: ${kgPerDay.toFixed(2)} kg\n` +
            `Approx. Volume: ${litersPerDay.toFixed(1)} Liters`;
    };

    document.getElementById('btnCalcSys').onclick = () => {
        const current = parseFloat(document.getElementById('soCurrent').value);
        const target = parseFloat(document.getElementById('soTarget').value);

        if(isNaN(current) || isNaN(target)) { alert('Заполни Текущий и Целевой уровень'); return; }
        if(target <= current) { alert('Целевой уровень должен быть больше текущего'); return; }

        const diff = target - current;
        const res = document.getElementById('resSys');
        res.style.display = 'block';
        res.innerText = 
            `Current Level: ${current} m³\n` +
            `Target Level: ${target} m³\n\n` +
            `Required Top-Up: ${diff.toFixed(2)} m³`;
    };

    let lubeRobItems = JSON.parse(localStorage.getItem('el_lube_rob')) || [];

    function renderLubeRob() {
        const box = document.getElementById('lubeRobList');
        if(!box) return;
        
        if(lubeRobItems.length === 0) {
            box.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">No data.</div>';
            return;
        }

        box.innerHTML = lubeRobItems.map((item, index) => {
            const isLow = item.rob < item.min;
            return `
                <div class="tank-list-item" style="flex-direction:column; align-items:stretch; gap:6px;">
                    <div style="display:flex; justify-content:space-between; gap:8px;">
                        <div style="font-weight:600; font-size:0.85rem;">${item.type}</div>
                        <button class="btn-danger" onclick="deleteLubeRob(${index})">Del</button>
                    </div>
                    <div style="font-size:0.8rem; color:${isLow ? 'var(--red)' : 'var(--text)'};">
                        ROB: ${item.rob} m³ | Min: ${item.min} m³ ${isLow ? '⚠️ LOW' : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    window.deleteLubeRob = function(index) {
        if(!confirm('Удалить запись?')) return;
        lubeRobItems.splice(index, 1);
        localStorage.setItem('el_lube_rob', JSON.stringify(lubeRobItems));
        renderLubeRob();
    };

    document.getElementById('btnAddLubeRob').onclick = () => {
        const type = document.getElementById('newLubeType').value;
        const rob = parseFloat(document.getElementById('newLubeRob').value) || 0;
        const min = parseFloat(document.getElementById('newLubeMin').value) || 0;

        const existingIndex = lubeRobItems.findIndex(i => i.type === type);
        
        if(existingIndex >= 0) {
            lubeRobItems[existingIndex].rob = rob;
            lubeRobItems[existingIndex].min = min;
        } else {
            lubeRobItems.push({ type, rob, min });
        }

        localStorage.setItem('el_lube_rob', JSON.stringify(lubeRobItems));
        document.getElementById('newLubeRob').value = 0;
        document.getElementById('newLubeMin').value = 1;
        renderLubeRob();
    };

    // === TASKS ===
    let taskItems = JSON.parse(localStorage.getItem('el_tasks')) || [];
    let taskFilter = 'all';

    function renderTasks() {
        const box = document.getElementById('tasksList');
        if(!box) return;

        let filtered = taskItems;
        if(taskFilter !== 'all') filtered = filtered.filter(t => t.status === taskFilter);

        filtered = filtered.slice().sort((a, b) => {
            const pMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
            if(pMap[a.priority] !== pMap[b.priority]) return pMap[b.priority] - pMap[a.priority];
            if(a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
            return b.ts - a.ts;
        });

        if(filtered.length === 0) {
            box.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">No tasks.</div>';
            return;
        }

        box.innerHTML = filtered.map(t => {
            const pColor = t.priority === 'High' ? 'var(--red)' : t.priority === 'Medium' ? 'var(--yellow)' : 'var(--text-muted)';
            const isDone = t.status === 'Done';
            return `
                <div class="tank-list-item" style="flex-direction:column; align-items:stretch; gap:6px; ${isDone ? 'opacity:0.55;' : ''}">
                    <div style="display:flex; justify-content:space-between; gap:8px;">
                        <div style="font-weight:600; font-size:0.85rem; ${isDone ? 'text-decoration:line-through;' : ''}">${t.name}</div>
                        <button class="btn-danger" onclick="deleteTask('${t.id}')">Del</button>
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">Assignee: ${t.assignee || '-'} | Deadline: ${t.deadline || '-'}</div>
                    <div style="font-size:0.75rem; color:${pColor};">Priority: ${t.priority} | Status: <span style="cursor:pointer; text-decoration:underline;" onclick="toggleTaskStatus('${t.id}')">${t.status}</span></div>
                </div>
            `;
        }).join('');
    }

    window.deleteTask = function(id) {
        if(!confirm('Удалить задачу?')) return;
        taskItems = taskItems.filter(t => t.id !== id);
        localStorage.setItem('el_tasks', JSON.stringify(taskItems));
        renderTasks();
    };

    window.toggleTaskStatus = function(id) {
        const t = taskItems.find(x => x.id === id);
        if(!t) return;
        if(t.status === 'Open') t.status = 'In Progress';
        else if(t.status === 'In Progress') t.status = 'Done';
        else t.status = 'Open';
        localStorage.setItem('el_tasks', JSON.stringify(taskItems));
        renderTasks();
    };

    document.getElementById('taskFilter').onchange = function() {
        taskFilter = this.value;
        renderTasks();
    };

    document.getElementById('btnAddTask').onclick = () => {
        const name = document.getElementById('taskName').value.trim();
        if(!name) { alert('Enter task name'); return; }
        taskItems.push({
            id: 'tk_' + Date.now(),
            name,
            assignee: document.getElementById('taskAssignee').value.trim(),
            priority: document.getElementById('taskPriority').value,
            deadline: document.getElementById('taskDeadline').value,
            status: document.getElementById('taskStatus').value,
            ts: Date.now()
        });
        localStorage.setItem('el_tasks', JSON.stringify(taskItems));
        document.getElementById('taskName').value = '';
        document.getElementById('taskAssignee').value = '';
        document.getElementById('taskDeadline').value = '';
        renderTasks();
    };

    document.getElementById('btnExportTasks').onclick = () => {
        if(taskItems.length === 0) { alert('No tasks'); return; }
        let csv = 'Task,Assignee,Priority,Deadline,Status\n';
        taskItems.forEach(t => {
            csv += `"${(t.name||'').replace(/"/g,'""')}","${t.assignee||''}","${t.priority}","${t.deadline||''}","${t.status}"\n`;
        });
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Tasks_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
    };

    // === SEA TRIAL ===
    let seaTrialItems = JSON.parse(localStorage.getItem('el_seatrial')) || [];

    function renderSeaTrial() {
        const box = document.getElementById('seaTrialList');
        if(!box) return;
        if(seaTrialItems.length === 0) { box.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">No data.</div>'; return; }

        box.innerHTML = seaTrialItems.slice().reverse().map(item => `
            <div class="tank-list-item" style="flex-direction:column; align-items:stretch; gap:4px;">
                <div style="display:flex; justify-content:space-between;">
                    <div style="font-weight:600; font-size:0.85rem;">${item.condition}</div>
                    <button class="btn-danger" onclick="deleteSeaTrial('${item.id}')">Del</button>
                </div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${item.date.replace('T', ' ')}</div>
                <div style="font-size:0.8rem; display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                    <div>RPM: ${item.rpm}</div><div>Power: ${item.power} kW</div>
                    <div>SFOC: ${item.sfoc}</div><div>Temp: ${item.temp}°C</div>
                </div>
                ${item.notes ? `<div style="font-size:0.75rem; color:var(--yellow);">Note: ${item.notes}</div>` : ''}
            </div>
        `).join('');
    }

    window.deleteSeaTrial = function(id) {
        seaTrialItems = seaTrialItems.filter(i => i.id !== id);
        localStorage.setItem('el_seatrial', JSON.stringify(seaTrialItems));
        renderSeaTrial();
    };

    document.getElementById('btnAddSeaTrial').onclick = () => {
        const date = document.getElementById('stDate').value;
        if(!date) { alert('Enter Date & Time'); return; }
        seaTrialItems.push({
            id: 'st_' + Date.now(),
            date,
            condition: document.getElementById('stCondition').value,
            rpm: document.getElementById('stRpm').value || '-',
            power: document.getElementById('stPower').value || '-',
            fuel: document.getElementById('stFuel').value || '-',
            sfoc: document.getElementById('stSfoc').value || '-',
            pmax: document.getElementById('stPmax').value || '-',
            temp: document.getElementById('stTemp').value || '-',
            notes: document.getElementById('stNotes').value.trim()
        });
        localStorage.setItem('el_seatrial', JSON.stringify(seaTrialItems));
        ['stRpm','stPower','stFuel','stSfoc','stPmax','stTemp','stNotes'].forEach(id => document.getElementById(id).value = '');
        renderSeaTrial();
    };

    document.getElementById('btnExportSeaTrial').onclick = () => {
        if(seaTrialItems.length === 0) return;
        let csv = 'Date,Condition,RPM,Power_kW,Fuel_Lh,SFOC,Pmax,Exhaust_Temp,Notes\n';
        seaTrialItems.forEach(i => {
            csv += `"${i.date}","${i.condition}","${i.rpm}","${i.power}","${i.fuel}","${i.sfoc}","${i.pmax}","${i.temp}","${(i.notes||'').replace(/"/g,'""')}"\n`;
        });
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
        link.download = `SeaTrial_${new Date().toISOString().slice(0,10)}.csv`; link.click();
    };

    // === FAULTS ===
    let faultItems = JSON.parse(localStorage.getItem('el_faults')) || [];

    function renderFaults() {
        const box = document.getElementById('faultsList');
        if(!box) return;
        if(faultItems.length === 0) { box.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">No faults logged.</div>'; return; }

        box.innerHTML = faultItems.slice().reverse().map(f => {
            const isRes = f.status === 'Resolved';
            return `
                <div class="tank-list-item" style="flex-direction:column; align-items:stretch; gap:6px; ${isRes ? 'opacity:0.6;' : ''}">
                    <div style="display:flex; justify-content:space-between; gap:8px;">
                        <div style="font-weight:600; font-size:0.85rem;">${f.equip}</div>
                        <button class="btn-danger" onclick="deleteFault('${f.id}')">Del</button>
                    </div>
                    <div style="font-size:0.8rem;">${f.desc}</div>
                    <div style="font-size:0.75rem; color:var(--yellow);">Action: ${f.action || '-'}</div>
                    <div style="font-size:0.75rem; color:${isRes ? 'var(--green)' : 'var(--red)'}; cursor:pointer;" onclick="toggleFault('${f.id}')">Status: ${f.status}</div>
                </div>
            `;
        }).join('');
    }

    window.deleteFault = function(id) { faultItems = faultItems.filter(i => i.id !== id); localStorage.setItem('el_faults', JSON.stringify(faultItems)); renderFaults(); };
    window.toggleFault = function(id) {
        const f = faultItems.find(x => x.id === id);
        if(f) { f.status = f.status === 'Open' ? 'Resolved' : 'Open'; localStorage.setItem('el_faults', JSON.stringify(faultItems)); renderFaults(); }
    };

    document.getElementById('btnAddFault').onclick = () => {
        const equip = document.getElementById('fltEquip').value.trim();
        if(!equip) return alert('Enter Equipment');
        faultItems.push({
            id: 'f_' + Date.now(), equip,
            desc: document.getElementById('fltDesc').value.trim(),
            action: document.getElementById('fltAction').value.trim(),
            status: document.getElementById('fltStatus').value
        });
        localStorage.setItem('el_faults', JSON.stringify(faultItems));
        ['fltEquip','fltDesc','fltAction'].forEach(id => document.getElementById(id).value = '');
        renderFaults();
    };

    // === EMERGENCY PROCEDURES ===
    const DEFAULT_PROCEDURES = [
        { 
            id: 'ep_1', 
            title: '🔥 FIRE IN ENGINE ROOM', 
            text: '1. Sound the alarm (непрерывный звонок).\n2. All emergency squad members arrived in engine room.\n3. Power in the fire zone disconnected.\n4. Stop M/E and generators (если безопасно).\n5. Activate fixed firefighting system after confirming no personnel.\n6. Close all doors, vents, and skylights.' 
        },
        { 
            id: 'ep_2', 
            title: '⚡ BLACKOUT', 
            text: '1. Check Emergency Generator started and connected.\n2. Notify Bridge.\n3. Investigate cause (overload, trip, fuel issue).\n4. Restore power step-by-step (avoid large loads immediately).' 
        },
        { 
            id: 'ep_3', 
            title: '🌊 FLOODING', 
            text: '1. General alarm.\n2. Locate the leak (sounding, visual).\n3. Start emergency bilge pump.\n4. Close watertight doors.\n5. Inform Master.' 
        }
    ];

    let emergProcedures = JSON.parse(localStorage.getItem('el_emergency_procedures')) || [];
    if(emergProcedures.length === 0) {
        emergProcedures = [...DEFAULT_PROCEDURES];
        localStorage.setItem('el_emergency_procedures', JSON.stringify(emergProcedures));
    }

    let editingProcedureId = null;

    function renderEmergencyProcedures() {
        const box = document.getElementById('emergencyProceduresList');
        if(!box) return;
        
        if(emergProcedures.length === 0) {
            box.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">No procedures.</div>';
            return;
        }

        box.innerHTML = emergProcedures.map(p => `
            <details style="margin-bottom:10px; padding:10px; background:var(--bg); border-radius:8px; border:1px solid var(--border);">
                <summary style="cursor:pointer; font-weight:600; color:var(--accent); display:flex; justify-content:space-between; align-items:center;">
                    <span>${p.title}</span>
                </summary>
                <div style="margin-top:10px; font-size:0.8rem; line-height:1.4; white-space:pre-wrap; color:var(--text);">${p.text}</div>
                <div style="margin-top:10px; display:flex; gap:8px;">
                    <button class="btn" style="margin-top:0; padding:6px; font-size:0.75rem; background:var(--border); color:var(--text);" onclick="editEmerProcedure('${p.id}')">✏️ Edit</button>
                    <button class="btn-danger" style="padding:6px 12px; font-size:0.75rem;" onclick="deleteEmerProcedure('${p.id}')">Del</button>
                </div>
            </details>
        `).join('');
    }

    window.deleteEmerProcedure = function(id) {
        if(!confirm('Удалить памятку?')) return;
        emergProcedures = emergProcedures.filter(p => p.id !== id);
        localStorage.setItem('el_emergency_procedures', JSON.stringify(emergProcedures));
        renderEmergencyProcedures();
    };

    window.editEmerProcedure = function(id) {
        const p = emergProcedures.find(x => x.id === id);
        if(!p) return;
        document.getElementById('newEmerTitle').value = p.title;
        document.getElementById('newEmerText').value = p.text;
        editingProcedureId = id;
        document.getElementById('btnAddEmerProcedure').textContent = '💾 Update Procedure';
        document.getElementById('newEmerTitle').focus();
    };

    document.getElementById('btnAddEmerProcedure').onclick = () => {
        const title = document.getElementById('newEmerTitle').value.trim();
        const text = document.getElementById('newEmerText').value.trim();
        if(!title || !text) { alert('Заполни название и текст'); return; }

        if(editingProcedureId) {
            const p = emergProcedures.find(x => x.id === editingProcedureId);
            if(p) { p.title = title; p.text = text; }
            editingProcedureId = null;
            document.getElementById('btnAddEmerProcedure').textContent = '+ Save Procedure';
        } else {
            emergProcedures.push({ id: 'ep_' + Date.now(), title, text });
        }

        localStorage.setItem('el_emergency_procedures', JSON.stringify(emergProcedures));
        document.getElementById('newEmerTitle').value = '';
        document.getElementById('newEmerText').value = '';
        renderEmergencyProcedures();
    };

    // === EMERGENCY CONTACTS ===
    let emergContacts = JSON.parse(localStorage.getItem('el_emergency')) || [];

    function renderEmergency() {
        const box = document.getElementById('emergencyList');
        if(!box) return;
        if(emergContacts.length === 0) { box.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">No contacts.</div>'; return; }
        box.innerHTML = emergContacts.map(c => `
            <div class="tank-list-item">
                <div>
                    <div style="font-weight:600; font-size:0.9rem; color:var(--accent);">${c.role}</div>
                    <div style="font-size:0.8rem;">${c.name}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">${c.phone}</div>
                </div>
                <button class="btn-danger" onclick="deleteEmergency('${c.id}')">Del</button>
            </div>
        `).join('');
    }

    window.deleteEmergency = function(id) { emergContacts = emergContacts.filter(i => i.id !== id); localStorage.setItem('el_emergency', JSON.stringify(emergContacts)); renderEmergency(); };

    document.getElementById('btnAddEmergency').onclick = () => {
        const role = document.getElementById('newEmerRole').value.trim();
        if(!role) return alert('Enter Role');
        emergContacts.push({ id: 'e_' + Date.now(), role, name: document.getElementById('newEmerName').value.trim(), phone: document.getElementById('newEmerPhone').value.trim() });
        localStorage.setItem('el_emergency', JSON.stringify(emergContacts));
        ['newEmerRole','newEmerName','newEmerPhone'].forEach(id => document.getElementById(id).value = '');
        renderEmergency();
    };

    // === SMART SUMMARY (ATTENTION REQUIRED) ===
    function renderSmartSummary() {
        const container = document.getElementById('smartSummaryContainer');
        if(!container) return;

        try {
            if (typeof taskItems === 'undefined' || typeof warrantyItems === 'undefined' || typeof tanks === 'undefined') {
                return;
            }
            
            let html = '';
            let hasAlerts = false;

        // 1. Проверяем Задачи (High Priority или Дедлайн сегодня/завтра)
        const urgentTasks = taskItems.filter(t => {
            if(t.status === 'Done') return false;
            if(t.priority === 'High') return true;
            if(t.deadline) {
                const daysLeft = (new Date(t.deadline) - new Date()) / (1000*60*60*24);
                if(daysLeft <= 2) return true; // Просрочено или осталось 2 дня
            }
            return false;
        });
        if (urgentTasks.length > 0) {
            hasAlerts = true;
            html += `
                <div class="dash-card" style="border-color: var(--yellow); background: rgba(212,175,55,0.05); margin-bottom: 8px;" onclick="goToTab('engine', 'tasks')">
                    <div class="dash-icon" style="color: var(--yellow); border-color: rgba(212,175,55,0.3); background: rgba(212,175,55,0.1);">⚠️</div>
                    <div class="dash-content">
                        <div class="dash-title" style="color: var(--yellow); font-size: 0.9rem;">${urgentTasks.length} Urgent Task(s)</div>
                        <div class="dash-subtitle">High priority or deadline is coming.</div>
                    </div>
                </div>
            `;
        }

        // 2. Проверяем Гарантию (Истекает менее чем через 30 дней)
        const expiringWarranty = warrantyItems.filter(w => {
            if(w.status === 'Resolved' || w.status === 'Rejected') return false;
            if(w.expiry) {
                const daysLeft = (new Date(w.expiry) - new Date()) / (1000*60*60*24);
                if(daysLeft <= 30) return true;
            }
            return false;
        });
        if (expiringWarranty.length > 0) {
            hasAlerts = true;
            html += `
                <div class="dash-card" style="border-color: var(--red); background: rgba(248,113,113,0.05); margin-bottom: 8px;" onclick="goToTab('newbuild', 'warranty')">
                    <div class="dash-icon" style="color: var(--red); border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.1);">🛡️</div>
                    <div class="dash-content">
                        <div class="dash-title" style="color: var(--red); font-size: 0.9rem;">${expiringWarranty.length} Warranty Expiring</div>
                        <div class="dash-subtitle">Claim expires within 30 days.</div>
                    </div>
                </div>
            `;
        }

        // 3. Проверяем Танки (Заполнены более чем на 85%)
        const highTanks = tanks.filter(t => (t.volume / t.capacity) >= 0.85);
        if (highTanks.length > 0) {
            hasAlerts = true;
            html += `
                <div class="dash-card" style="border-color: var(--red); background: rgba(248,113,113,0.05); margin-bottom: 8px;" onclick="goToTab('marpol', 'tanks')">
                    <div class="dash-icon" style="color: var(--red); border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.1);">🛢️</div>
                    <div class="dash-content">
                        <div class="dash-title" style="color: var(--red); font-size: 0.9rem;">High Tank Level</div>
                        <div class="dash-subtitle">${highTanks.length} tank(s) are above 85%.</div>
                    </div>
                </div>
            `;
        }

        // Отображаем результат
        if (hasAlerts) {
            container.innerHTML = `
                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; padding-left: 4px;">Attention Required</div>
                ${html}
            `;
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
        } catch(e) { return; }
    }

    // === BACKUP & RESTORE ===
    window.exportBackup = function() {
        let data = {};
        // Собираем все ключи, связанные с нашим приложением
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('el_') || key === 'vessel_tanks' || key === 'orb_history') {
                data[key] = localStorage.getItem(key);
            }
        }
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EngineLog_Backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    window.importBackup = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                let count = 0;
                for (const key in data) {
                    if (key.startsWith('el_') || key === 'vessel_tanks' || key === 'orb_history') {
                        localStorage.setItem(key, data[key]);
                        count++;
                    }
                }
                alert(`Успешно восстановлено ${count} записей. Приложение будет перезагружено.`);
                location.reload();
            } catch (err) {
                alert('Ошибка: Неверный формат файла бэкапа.');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Сбрасываем input
    };

    // === PUMP CALCULATOR ===
    document.getElementById('btnCalcPump').onclick = () => {
        const vol = parseFloat(document.getElementById('pumpVol').value);
        const rate = parseFloat(document.getElementById('pumpRate').value);
        const currVol = parseFloat(document.getElementById('pumpCurrVol').value);
        const cap = parseFloat(document.getElementById('pumpCap').value);
        
        const res = document.getElementById('resPump');
        
        if (isNaN(vol) || isNaN(rate) || isNaN(currVol) || isNaN(cap)) {
            alert('Заполни все поля'); return;
        }
        if (rate <= 0) {
            alert('Производительность насоса должна быть больше 0'); return;
        }
        
        // Расчет времени
        const hoursDecimal = vol / rate;
        const hours = Math.floor(hoursDecimal);
        const minutes = Math.round((hoursDecimal - hours) * 60);
        
        // Проверка перелива
        const finalVol = currVol + vol;
        const isOverflow = finalVol > cap;
        const spaceLeft = cap - currVol;
        
        res.style.display = 'block';
        res.innerText = 
            `Transfer Time: ${hours} h ${minutes} min\n` +
            `Total Volume in Tank: ${finalVol.toFixed(1)} m³ / ${cap.toFixed(1)} m³\n\n`;
            
        if (isOverflow) {
            res.style.color = 'var(--red)';
            res.innerText += `⚠️ WARNING: OVERFLOW BY ${(finalVol - cap).toFixed(1)} m³!\nMax volume to transfer safely: ${spaceLeft.toFixed(1)} m³.`;
        } else {
            res.style.color = 'var(--green)';
            res.innerText += `✅ SAFE. Space remaining in tank: ${(cap - finalVol).toFixed(1)} m³.`;
        }
    };

// === CLOCK (UTC & SHIP TIME) ===
    let timeOffsetHours = parseFloat(localStorage.getItem('el_time_offset')) || 0;

    function updateClocks() {
        const now = new Date();
        const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

        const utcHours = String(now.getUTCHours()).padStart(2, '0');
        const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0');
        const utcSeconds = String(now.getUTCSeconds()).padStart(2, '0');
        const utcDateStr = `${String(now.getUTCDate()).padStart(2, '0')} ${months[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
        
        if(document.getElementById('clock-utc')) {
            document.getElementById('clock-utc').innerText = `${utcHours}:${utcMinutes}:${utcSeconds}`;
            document.getElementById('date-utc').innerText = utcDateStr;
        }

        const ltTime = new Date(now.getTime() + (timeOffsetHours * 3600000));
        const ltHours = String(ltTime.getHours()).padStart(2, '0');
        const ltMinutes = String(ltTime.getMinutes()).padStart(2, '0');
        const ltSeconds = String(ltTime.getSeconds()).padStart(2, '0');
        const ltDateStr = `${String(ltTime.getDate()).padStart(2, '0')} ${months[ltTime.getMonth()]} ${ltTime.getFullYear()}`;
        
        if(document.getElementById('clock-lt')) {
            document.getElementById('clock-lt').innerText = `${ltHours}:${ltMinutes}:${ltSeconds}`;
            document.getElementById('date-lt').innerText = ltDateStr;
        }
    }

    window.setTimeOffset = function() {
        const currentOffset = timeOffsetHours;
        const input = prompt("Введите разницу с Гринвичем (UTC) в часах.\nНапример: 3, -1, 5.5 или 0", currentOffset);
        if (input !== null) {
            const parsed = parseFloat(input.toString().replace(',', '.'));
            if (!isNaN(parsed)) {
                timeOffsetHours = parsed;
                localStorage.setItem('el_time_offset', timeOffsetHours);
                updateClocks();
            } else {
                alert("Ошибка: введите число (например 3 или -1.5)");
            }
        }
    };

    updateClocks();
    setInterval(updateClocks, 1000);

    // === ENGINE HOURS TRACKER ===
    let eqHoursItems = JSON.parse(localStorage.getItem('el_engine_hours')) || [];

    function renderHours() {
        const box = document.getElementById('hoursList');
        if(!box) return;

        if(eqHoursItems.length === 0) {
            box.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">No equipment added yet.</div>';
            return;
        }

        // Группируем данные
        const groups = {};
        eqHoursItems.forEach(eq => {
            const g = eq.group || 'Other';
            if(!groups[g]) groups[g] = [];
            groups[g].push(eq);
        });

        // Рендерим группы
        let html = '';
        for (const [groupName, items] of Object.entries(groups)) {
            html += `
            <details open style="margin-bottom: 20px;">
                <summary style="font-size: 0.9rem; color: var(--accent); font-weight: 700; padding: 8px; background: rgba(56,189,248,0.1); border-radius: 8px; border: 1px solid rgba(56,189,248,0.2); cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                    <span>📁 ${groupName}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 400;">${items.length} units</span>
                </summary>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-top: 10px;">
                    ${items.map(eq => {
                        let deltaHTML = '';
                        if (eq.history && eq.history.length >= 2) {
                            const lastIdx = eq.history.length - 1;
                            const delta = eq.history[lastIdx].hours - eq.history[lastIdx - 1].hours;
                            if (delta > 0) {
                                deltaHTML = `<span style="color:var(--green); font-size:0.75rem; font-weight:700; background:rgba(74,222,128,0.1); padding:2px 4px; border-radius:4px;">+${delta.toFixed(1)}h</span>`;
                            } else {
                                deltaHTML = `<span style="color:var(--text-muted); font-size:0.75rem; font-weight:700; background:rgba(255,255,255,0.05); padding:2px 4px; border-radius:4px;">+0h</span>`;
                            }
                        }

                        return `
                        <div style="background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:10px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; position:relative;">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                <div style="font-weight:700; font-size:0.85rem; color:var(--text); word-break:break-word; padding-right:15px;">${eq.name}</div>
                                <button class="btn-danger" style="position:absolute; top:8px; right:8px; padding:2px 5px; font-size:0.6rem; border-radius:4px;" onclick="deleteEqHours('${eq.id}')">✕</button>
                            </div>
                            <div style="font-size:1.3rem; font-weight:800; color:var(--text); font-family:monospace; text-align:center; margin-bottom:8px;">
                                ${eq.hours.toFixed(1)}
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                ${deltaHTML || '<span></span>'}
                                <button class="btn" style="margin:0; padding:4px 8px; font-size:0.7rem; width:auto; background:rgba(56,189,248,0.2); color:var(--accent); border:none;" onclick="updateHours('${eq.id}')">Update</button>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </details>
            `;
        }
        
        box.innerHTML = html;
    }

    window.updateHours = function(id) {
        const eq = eqHoursItems.find(x => x.id === id);
        if(!eq) return;
        
        const newHoursStr = prompt(`Enter new hours for ${eq.name}:\n(Current: ${eq.hours})`, eq.hours);
        if(newHoursStr === null) return;
        
        const newHours = parseFloat(newHoursStr.toString().replace(',', '.'));
        if(isNaN(newHours) || newHours < eq.hours) {
            alert('Некорректное значение (должно быть больше или равно текущему)');
            return;
        }

        const today = new Date().toISOString().slice(0, 10);
        eq.hours = newHours;
        eq.date = today;
        if(!eq.history) eq.history = [];
        eq.history.push({ date: today, hours: newHours });

        localStorage.setItem('el_engine_hours', JSON.stringify(eqHoursItems));
        renderHours();
    };

    window.deleteEqHours = function(id) {
        if(!confirm('Удалить этот механизм?')) return;
        eqHoursItems = eqHoursItems.filter(x => x.id !== id);
        localStorage.setItem('el_engine_hours', JSON.stringify(eqHoursItems));
        renderHours();
    };

    document.getElementById('btnAddEq').onclick = () => {
        const name = document.getElementById('newEqName').value.trim();
        const hours = parseFloat(document.getElementById('newEqHours').value);
        const date = document.getElementById('newEqDate').value;

        if(!name || isNaN(hours) || !date) { alert('Заполни все поля'); return; }

        const group = document.getElementById('newEqGroup').value;
        eqHoursItems.push({
            id: 'eq_' + Date.now(),
            name: name,
            group: group,
            hours: hours,
            date: date,
            history: [{ date: date, hours: hours }]
        });

        localStorage.setItem('el_engine_hours', JSON.stringify(eqHoursItems));
        document.getElementById('newEqName').value = '';
        document.getElementById('newEqHours').value = '0';
        renderHours();
    };

    // === SUB-TABS BINDING (Fuel) ===
    document.querySelectorAll('[data-fueltab]').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('[data-fueltab]').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#tab-fuel .sub-content').forEach(c => c.style.display = 'none');
            btn.classList.add('active');
            document.getElementById('fuel-' + btn.dataset.fueltab).style.display = 'block';
        };
    });

    window.toggleFuelCalc = function() {
        const type = document.getElementById('fuelCalcType').value;
        document.getElementById('calc-vcf').style.display = type === 'vcf' ? 'block' : 'none';
        document.getElementById('calc-flow').style.display = type === 'flow' ? 'block' : 'none';
    };

    // === DAILY FUEL LOG ===
    let fuelLogItems = JSON.parse(localStorage.getItem('el_fuel_log')) || [];
    let meterSettings = JSON.parse(localStorage.getItem('el_meter_settings')) || {
        me: true, dgin: true, dgout: false, blr: true, common: false,
        type: 'vol', scheme: 'direct'
    };

    function loadMeterSettings() {
        document.getElementById('chk_me').checked = meterSettings.me;
        document.getElementById('chk_dgin').checked = meterSettings.dgin;
        document.getElementById('chk_dgout').checked = meterSettings.dgout;
        document.getElementById('chk_blr').checked = meterSettings.blr;
        document.getElementById('chk_common').checked = meterSettings.common;
        
        document.getElementById('mtype_select').value = meterSettings.type;
        
        // Миграция старых схем
        let savedScheme = meterSettings.scheme || 'direct';
        if (savedScheme === 'common') savedScheme = 'common_all'; // Старая схема
        if (!['direct', 'common_all', 'common_me_dg'].includes(savedScheme)) savedScheme = 'direct';
        
        meterSettings.scheme = savedScheme;
        document.getElementById('scheme_select').value = savedScheme;

        applyMeterVisibility();
    }

    function applyMeterVisibility() {
        const isMass = meterSettings.type === 'mass';
        const scheme = meterSettings.scheme || 'direct';
        const useCommon = (scheme === 'common_all' || scheme === 'common_me_dg');
        
        // Скрываем/Показываем блоки
        // Если используем общий счетчик, блок ME скрываем (расход ГД будет рассчитан)
        document.getElementById('block-me').style.display = (meterSettings.me && !useCommon) ? 'block' : 'none';
        document.getElementById('block-dgin').style.display = meterSettings.dgin ? 'block' : 'none';
        document.getElementById('block-dgout').style.display = meterSettings.dgout ? 'block' : 'none';
        document.getElementById('block-blr').style.display = meterSettings.blr ? 'block' : 'none';
        // Блок Common показываем только если выбрана одна из схем с общим счетчиком
        document.getElementById('block-common').style.display = (meterSettings.common && useCommon) ? 'block' : 'none';

        // Если массовый расходомер, скрываем поля Температуры и Плотности
        const hideTempsDens = () => {
            document.querySelectorAll('[id$="Temp"], [id$="Dens"]').forEach(el => {
                if(el.id.includes('flog')) el.parentElement.style.display = isMass ? 'none' : 'block';
            });
            // Меняем единицы измерения в лейблах (m³ на MT)
            document.querySelectorAll('label').forEach(el => {
                if(el.innerText.includes('(m³)') && el.nextElementSibling && el.nextElementSibling.id.includes('flog')) {
                    el.innerText = isMass ? 'Curr (MT)' : 'Curr (m³)';
                }
            });
        };
        hideTempsDens();
    }

    window.saveMeterSettings = function() {
        meterSettings = {
            me: document.getElementById('chk_me').checked,
            dgin: document.getElementById('chk_dgin').checked,
            dgout: document.getElementById('chk_dgout').checked,
            blr: document.getElementById('chk_blr').checked,
            common: document.getElementById('chk_common').checked,
            type: document.getElementById('mtype_select').value,
            scheme: document.getElementById('scheme_select').value
        };
        localStorage.setItem('el_meter_settings', JSON.stringify(meterSettings));
        applyMeterVisibility();
        document.getElementById('meterSettings').style.display = 'none';
    };

    function renderFuelLog() {
        const box = document.getElementById('flogList');
        if(!box) return;
        
        // Автозаполнение предыдущих показаний (берем последнюю запись)
        if (fuelLogItems.length > 0) {
            const last = fuelLogItems[fuelLogItems.length - 1];
            if(meterSettings.me) document.getElementById('flogMEPrev').value = last.meCurr || 0;
            if(meterSettings.dgin) document.getElementById('flogDGPrev').value = last.dgCurr || 0;
            if(meterSettings.dgout) document.getElementById('flogDGOutPrev').value = last.dgOutCurr || 0;
            if(meterSettings.blr) document.getElementById('flogBLRPrev').value = last.blrCurr || 0;
            if(meterSettings.common) document.getElementById('flogCommPrev').value = last.commCurr || 0;
            document.getElementById('flogROB').placeholder = `Prev ROB: ${last.rob}`;
        }

        if(fuelLogItems.length === 0) {
            box.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">No records.</div>';
            return;
        }

        box.innerHTML = fuelLogItems.slice().reverse().map((item, idx) => {
            const realIdx = fuelLogItems.length - 1 - idx;
            return `
            <div class="tank-list-item" style="flex-direction:column; align-items:stretch; gap:4px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
                <div style="display:flex; justify-content:space-between;">
                    <div style="font-weight:600; font-size:0.85rem; color:var(--accent);">${item.date}</div>
                    <button class="btn-danger" onclick="deleteFuelLog(${realIdx})" style="padding:2px 6px; font-size:0.7rem;">Del</button>
                </div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
                    ME: <b style="color:var(--text)">${item.meMT.toFixed(2)} MT</b> | 
                    DG: <b style="color:var(--text)">${item.dgMT.toFixed(2)} MT</b> | 
                    BLR: <b style="color:var(--text)">${item.blrMT.toFixed(2)} MT</b>
                </div>
                <div style="font-size:0.85rem; font-weight:700; color:var(--green); margin-top:4px;">
                    Total ROB: ${item.rob} MT
                </div>
            </div>
            `;
        }).join('');
    }

    window.deleteFuelLog = function(idx) {
        if(!confirm('Delete this record?')) return;
        fuelLogItems.splice(idx, 1);
        localStorage.setItem('el_fuel_log', JSON.stringify(fuelLogItems));
        renderFuelLog();
    };

    document.getElementById('btnAddFlog').onclick = () => {
        const date = document.getElementById('flogDate').value;
        if(!date) { alert('Enter Date'); return; }

        const bunker = parseFloat(document.getElementById('flogBunker').value) || 0;
        const robStr = document.getElementById('flogROB').value;
        
        // Универсальная функция расчета (учитывает Массу или Объем)
        const calcMT = (currId, prevId, tempId, densId) => {
            if(!document.getElementById(currId)) return { mt: 0, vol: 0, curr: 0, prev: 0 };
            const curr = parseFloat(document.getElementById(currId).value) || 0;
            const prev = parseFloat(document.getElementById(prevId).value) || 0;
            
            if(curr === 0) return { mt: 0, vol: 0, curr: prev, prev }; 
            
            const delta = curr - prev;

            if (meterSettings.type === 'mass') {
                // Если массовый расходомер, то Curr - Prev = сразу MT. Плотность не нужна.
                return { mt: delta, vol: delta, curr, prev };
            } else {
                // Если объемный, считаем через VCF
                const temp = parseFloat(document.getElementById(tempId).value) || 15;
                const dens = parseFloat(document.getElementById(densId).value) || 0.95;
                const vcf = typeof getVcf === 'function' ? (getVcf(dens) || 0.00065) : 0.00065;
                const mt = delta * dens - vcf * (temp - 15) * delta * dens;
                return { mt, vol: delta, curr, prev };
            }
        };

        // Считаем по каждому счетчику (если он включен в настройках)
        const me = meterSettings.me ? calcMT('flogMECurr', 'flogMEPrev', 'flogMETemp', 'flogMEDens') : { mt: 0, vol: 0, curr: 0, prev: 0 };
        const dgIn = meterSettings.dgin ? calcMT('flogDGCurr', 'flogDGPrev', 'flogDGTemp', 'flogDGDens') : { mt: 0, vol: 0, curr: 0, prev: 0 };
        const dgOut = meterSettings.dgout ? calcMT('flogDGOutCurr', 'flogDGOutPrev', 'flogDGOutTemp', 'flogDGOutDens') : { mt: 0, vol: 0, curr: 0, prev: 0 };
        const blr = meterSettings.blr ? calcMT('flogBLRCurr', 'flogBLRPrev', 'flogBLRTemp', 'flogBLRDens') : { mt: 0, vol: 0, curr: 0, prev: 0 };
        const comm = meterSettings.common ? calcMT('flogCommCurr', 'flogCommPrev', 'flogCommTemp', 'flogCommDens') : { mt: 0, vol: 0, curr: 0, prev: 0 };

        // Логика расчета (как в Excel)
        let dgTotalMT = dgIn.mt - dgOut.mt;
        if (dgTotalMT < 0) dgTotalMT = 0;

        let meFinalMT = me.mt;
        const scheme = meterSettings.scheme || 'direct';
        
        // ЛОГИКА РАСЧЕТА В ЗАВИСИМОСТИ ОТ СХЕМЫ
        if (scheme === 'common_all' && meterSettings.common) {
            // Схема 2: Общий на всё. ГД = Common - DG - BLR
            meFinalMT = comm.mt - dgTotalMT - blr.mt;
        } 
        else if (scheme === 'common_me_dg' && meterSettings.common) {
            // Схема 3: Общий на ГД+ДГ. ГД = Common - DG (котел отдельно)
            meFinalMT = comm.mt - dgTotalMT;
        }
        // Схема 1 (direct): meFinalMT остается = me.mt (прямой счетчик)
        
        // Защита от отрицательного расхода (если ввели данные с ошибкой)
        if (meFinalMT < 0) meFinalMT = 0;

        // ROB (если не введен вручную, считаем автоматически)
        let newRob = parseFloat(robStr);
        if(isNaN(newRob)) {
            const prevItem = fuelLogItems.length > 0 ? fuelLogItems[fuelLogItems.length - 1] : null;
            const prevRob = prevItem ? prevItem.rob : 0;
            newRob = prevRob - (meFinalMT + dgTotalMT + blr.mt) + bunker;
        }

        // Сохраняем запись
        fuelLogItems.push({ 
            date, bunker, rob: newRob,
            mePrev: me.prev, meCurr: me.curr, meMT: meFinalMT,
            dgPrev: dgIn.prev, dgCurr: dgIn.curr, dgMT: dgTotalMT,
            dgOutCurr: dgOut.curr,
            blrPrev: blr.prev, blrCurr: blr.curr, blrMT: blr.mt,
            commCurr: comm.curr
        });
        
        localStorage.setItem('el_fuel_log', JSON.stringify(fuelLogItems));
        
        // Очистка текущих значений
        if(meterSettings.me) document.getElementById('flogMECurr').value = '';
        if(meterSettings.dgin) document.getElementById('flogDGCurr').value = '';
        if(meterSettings.dgout) document.getElementById('flogDGOutCurr').value = '';
        if(meterSettings.blr) document.getElementById('flogBLRCurr').value = '';
        if(meterSettings.common) document.getElementById('flogCommCurr').value = '';
        document.getElementById('flogROB').value = '';
        document.getElementById('flogBunker').value = '0';
        
        renderFuelLog();
        alert(`Log saved!\nME: ${meFinalMT.toFixed(2)} MT\nDG Total: ${dgTotalMT.toFixed(2)} MT\nBLR: ${blr.mt.toFixed(2)} MT\nNew ROB: ${newRob.toFixed(2)} MT`);
    };

    document.getElementById('btnExportFlog').onclick = () => {
        if(fuelLogItems.length === 0) return;
        let csv = 'Date,ME_Curr,ME_Cons_MT,DG_Curr,DG_Cons_MT,BLR_Curr,BLR_Cons_MT,Bunker_Received,ROB\n';
        fuelLogItems.forEach(i => {
            csv += `"${i.date}","${i.meCurr}","${i.meMT.toFixed(2)}","${i.dgCurr}","${i.dgMT.toFixed(2)}","${i.blrCurr}","${i.blrMT.toFixed(2)}","${i.bunker}","${i.rob}"\n`;
        });
        const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8;'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `FuelLog_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
    };

    function renderFuelLog() {
        const box = document.getElementById('flogList');
        if(!box) return;
        if(fuelLogItems.length === 0) {
            box.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">No records.</div>';
            return;
        }

        box.innerHTML = fuelLogItems.slice().reverse().map((item, idx) => {
            const realIdx = fuelLogItems.length - 1 - idx;
            return `
            <div class="tank-list-item" style="flex-direction:column; align-items:stretch; gap:4px;">
                <div style="display:flex; justify-content:space-between;">
                    <div style="font-weight:600; font-size:0.85rem; color:var(--accent);">${item.date}</div>
                    <button class="btn-danger" onclick="deleteFuelLog(${realIdx})" style="padding:2px 6px; font-size:0.7rem;">Del</button>
                </div>
                <div style="font-size:0.75rem; display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; margin-top:4px;">
                    <div>ME: ${item.me} MT</div><div>AE: ${item.ae} MT</div><div>BLR: ${item.blr} MT</div>
                </div>
                <div style="font-size:0.85rem; font-weight:700; color:var(--green); margin-top:4px;">Total ROB: ${item.rob} MT</div>
            </div>
            `;
        }).join('');
    }

    window.deleteFuelLog = function(idx) {
        if(!confirm('Delete this record?')) return;
        fuelLogItems.splice(idx, 1);
        localStorage.setItem('el_fuel_log', JSON.stringify(fuelLogItems));
        renderFuelLog();
    };

    document.getElementById('btnAddFlog').onclick = () => {
        const date = document.getElementById('flogDate').value;
        const me = parseFloat(document.getElementById('flogME').value) || 0;
        const ae = parseFloat(document.getElementById('flogAE').value) || 0;
        const blr = parseFloat(document.getElementById('flogBLR').value) || 0;
        const rob = parseFloat(document.getElementById('flogROB').value) || 0;

        if(!date) { alert('Enter Date'); return; }
        fuelLogItems.push({ date, me, ae, blr, rob });
        localStorage.setItem('el_fuel_log', JSON.stringify(fuelLogItems));
        
        document.getElementById('flogME').value = '';
        document.getElementById('flogAE').value = '';
        document.getElementById('flogBLR').value = '';
        document.getElementById('flogROB').value = '';
        renderFuelLog();
    };

    document.getElementById('btnExportFlog').onclick = () => {
        if(fuelLogItems.length === 0) return;
        let csv = 'Date,ME_Cons,AE_Cons,Boiler_Cons,Total_ROB\n';
        fuelLogItems.forEach(i => {
            csv += `"${i.date}","${i.me}","${i.ae}","${i.blr}","${i.rob}"\n`;
        });
        const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8;'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `FuelLog_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
    };

    // === VOYAGE CALCULATOR ===
    document.getElementById('btnCalcVoyage').onclick = () => {
        const dist = parseFloat(document.getElementById('vpDist').value);
        const speed = parseFloat(document.getElementById('vpSpeed').value);
        const dailyCons = parseFloat(document.getElementById('vpCons').value);
        const rob = parseFloat(document.getElementById('vpRob').value);

        if(isNaN(dist) || isNaN(speed) || isNaN(dailyCons) || isNaN(rob) || speed === 0) {
            alert('Fill all fields correctly'); return;
        }

        const days = dist / (speed * 24); // Дистанция / (скорость * 24 часа)
        const totalCons = days * dailyCons;
        const expectedRob = rob - totalCons;

        const res = document.getElementById('resVoyage');
        res.style.display = 'block';
        
        let warn = '';
        if(expectedRob < 0) {
            warn = `\n⚠️ WARNING: SHORTAGE OF ${Math.abs(expectedRob).toFixed(1)} MT!\nYou need to bunker or reduce speed.`;
            res.style.color = 'var(--red)';
        } else {
            warn = `\n✅ SAFE: You will arrive with ${expectedRob.toFixed(1)} MT.`;
            res.style.color = 'var(--green)';
        }

        res.innerText = 
            `Voyage Details:\n` +
            `- Total Days: ${days.toFixed(1)} days\n` +
            `- Total Consumption: ${totalCons.toFixed(1)} MT\n` +
            `- Arrival ROB: ${expectedRob.toFixed(1)} MT` + warn;
    };

    // === INIT ===
    try { renderTankCards(); } catch(e) { console.error("Error in Tanks:", e); }
    try { renderOrbFields(); } catch(e) { console.error("Error in ORB:", e); }
    try { renderOrbHistory(); } catch(e) { console.error(e); }
    try { renderDelivery(); } catch(e) { console.error(e); }
    try { renderPunchList(); } catch(e) { console.error(e); }
    try { renderInventory(); } catch(e) { console.error(e); }
    try { renderReqAll(); } catch(e) { console.error(e); }
    try { renderWarranty(); } catch(e) { console.error(e); }
    try { renderNotes(); } catch(e) { console.error(e); }
    try { renderBunkerChecklist(); } catch(e) { console.error(e); }
    try { renderLubeRob(); } catch(e) { console.error(e); }
    try { renderTasks(); } catch(e) { console.error(e); }
    try { renderNoChecks(); } catch(e) { console.error(e); }
    try { renderSeaTrial(); } catch(e) { console.error(e); }
    try { renderFaults(); } catch(e) { console.error(e); }
    try { renderEmergency(); } catch(e) { console.error(e); }
    try { renderEmergencyProcedures(); } catch(e) { console.error(e); }
    try { renderHours(); } catch(e) { console.error(e); }
    try { loadMeterSettings(); } catch(e) { console.error(e); }
    try { renderFuelLog(); } catch(e) { console.error(e); }
    
    document.getElementById('stDate').value = new Date().toISOString().slice(0, 16);

    // ЗАПУСКАЕМ УМНЫЙ ДАШБОРД ТОЛЬКО ТЕПЕРЬ, КОГДА ВСЕ ДАННЫЕ ЗАГРУЖЕНЫ
    try { renderSmartSummary(); } catch(e) { console.error("Smart Summary error:", e); }

// === SERVICE WORKER (OFFLINE PWA) ===
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('SW registered!'))
                .catch(err => console.log('SW registration failed!', err));
        });
    }
        // Функция переключения HFO/DO
    window.setFuelType = function(type) {
        currentFuelType = type;
        document.getElementById('btn-hfo').classList.toggle('active', type === 'hfo');
        document.getElementById('btn-do').classList.toggle('active', type === 'do');
        renderTankCards();
    };
        // === ЛОГИКА ТАНКОВ ДЛЯ ORB ===
    
    // 1. Показываем/скрываем блок в зависимости от выбранного кода
    document.getElementById('orbCodeSelect').addEventListener('change', function() {
        const wrapper = document.getElementById('orbTankDistributionWrapper');
        if (this.value === 'H_FUEL' || this.value === 'H_LUBE') {
            wrapper.style.display = 'block';
            orbBunkerTanks = []; // Очищаем старые данные при смене кода
            renderOrbTankRows();
        } else {
            wrapper.style.display = 'none';
        }
    });

    // 2. Функция добавления строки
    window.addOrbTankRow = function() {
        orbBunkerTanks.push({ id: Date.now(), name: '', added: '', total: '' });
        renderOrbTankRows();
    };

    // 3. Функция удаления строки
    window.removeOrbTankRow = function(id) {
        orbBunkerTanks = orbBunkerTanks.filter(t => t.id !== id);
        renderOrbTankRows();
    };

    // 4. Обновление данных при вводе
    window.updateOrbTankData = function(id, field, value) {
        const tank = orbBunkerTanks.find(t => t.id === id);
        if (tank) tank[field] = value;
    };

    // 5. Отрисовка строк на экране
    window.renderOrbTankRows = function() {
        const container = document.getElementById('orbTankListContainer');
        if (!container) return;

        // Берем актуальный список танков из памяти
        const allTanks = JSON.parse(localStorage.getItem('vessel_tanks')) || [];
        const tankOptions = allTanks.map(t => `<option value="${t.name}">${t.name}</option>`).join('');

        if (orbBunkerTanks.length === 0) {
            container.innerHTML = '<div style="font-size:0.7rem; color:var(--text-muted); text-align:center;">No tanks added yet. Click "+ Add Tank"</div>';
            return;
        }

        container.innerHTML = orbBunkerTanks.map((t, index) => `
            <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:8px; padding:10px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="font-size:0.75rem; color:var(--accent); font-weight:bold;">Tank #${index + 1}</span>
                    <button type="button" onclick="removeOrbTankRow(${t.id})" style="background:transparent; border:none; color:var(--red); cursor:pointer; font-size:1.1rem;">🗑️</button>
                </div>
                <div class="form-group" style="margin-bottom:8px;">
                    <select onchange="updateOrbTankData(${t.id}, 'name', this.value)" style="width:100%; padding:8px; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:6px; font-size:0.8rem;">
                        <option value="">-- Select Tank --</option>
                        ${allTanks.map(opt => `<option value="${opt.name}" ${t.name === opt.name ? 'selected' : ''}>${opt.name}</option>`).join('')}
                    </select>
                </div>
                <div class="row-2">
                    <div class="form-group" style="margin-bottom:0;">
                        <label style="font-size:0.65rem;">Added (MT)</label>
                        <input type="number" step="0.1" value="${t.added}" onchange="updateOrbTankData(${t.id}, 'added', this.value)" style="padding:8px; font-size:0.8rem;">
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label style="font-size:0.65rem;">Total (MT)</label>
                        <input type="number" step="0.1" value="${t.total}" onchange="updateOrbTankData(${t.id}, 'total', this.value)" style="padding:8px; font-size:0.8rem;">
                    </div>
                </div>
            </div>
        `).join('');
    };
        // --- ХИТРЫЙ СЛОЙ ДЛЯ ДОБАВЛЕНИЯ ТАНКОВ В ORB ---
    document.getElementById('btnGenOrb').addEventListener('click', function() {
        // Ждем 50 миллисекунд, чтобы твой основной скрипт успел сгенерировать текст
        setTimeout(() => {
            const selectedCode = document.getElementById('orbCodeSelect').value;
            const resBox = document.getElementById('resOrb');
            
            // Если это бункеровка и есть сгенерированный текст
            if ((selectedCode === 'H_FUEL' || selectedCode === 'H_LUBE') && resBox.innerText.length > 10) {
                
                // Проверяем, не добавили ли мы уже танки (чтобы не дублировать при повторном клике)
                if (!resBox.innerText.includes('Tanks Distribution:')) {
                    let tanksText = '\n\nTanks Distribution:\n';
                    let hasTanks = false;
                    
                    orbBunkerTanks.forEach(t => {
                        if (t.name && parseFloat(t.added) > 0) {
                            const totalVal = t.total ? t.total : '0';
                            tanksText += `${t.added} MT added to ${t.name} now containing ${totalVal} MT\n`;
                            hasTanks = true;
                        }
                    });

                    // Если реально есть что добавлять, дописываем в конец
                    if (hasTanks) {
                        resBox.innerText = resBox.innerText + tanksText;
                    }
                }
            }
        }, 50); // Задержка 50 мс
    });
        // Функция для загрузки заметки в форму редактирования
        // === ПОЛНАЯ ЛОГИКА ДЛЯ ЗАМЕТОК (Замена отсутствующего кода) ===
    let editingNoteId = null;

    window.saveNote = function() {
        const title = document.getElementById('noteTitle').value;
        const body = document.getElementById('noteBody').value;
        const category = document.getElementById('noteCategory').value;
        const isPinned = document.getElementById('notePinned').value === 'yes';

        if (!title && !body) {
            alert('Введите заголовок или текст заметки!');
            return;
        }

        let notes = JSON.parse(localStorage.getItem('vessel_notes')) || [];

        if (editingNoteId) {
            // РЕЖИМ РЕДАКТИРОВАНИЯ
            const index = notes.findIndex(n => n.id === editingNoteId);
            if (index !== -1) {
                notes[index].title = title;
                notes[index].body = body;
                notes[index].category = category;
                notes[index].isPinned = isPinned;
            }
            cancelEditNote(); // Сбрасываем форму
        } else {
            // РЕЖИМ ДОБАВЛЕНИЯ
            notes.push({
                id: Date.now().toString(),
                title: title,
                body: body,
                category: category,
                isPinned: isPinned,
                timestamp: Date.now()
            });
            // Очищаем форму
            document.getElementById('noteTitle').value = '';
            document.getElementById('noteBody').value = '';
        }

        localStorage.setItem('vessel_notes', JSON.stringify(notes));
        renderNotesList(); // Обновляем список на экране
    };

    window.editNote = function(id) {
        let notes = JSON.parse(localStorage.getItem('vessel_notes')) || [];
        const note = notes.find(n => n.id === id);
        if (!note) return;

        document.getElementById('noteTitle').value = note.title || '';
        document.getElementById('noteBody').value = note.body || '';
        document.getElementById('noteCategory').value = note.category || 'General';
        document.getElementById('notePinned').value = note.isPinned ? 'yes' : 'no';

        editingNoteId = id;
        
        // Меняем кнопку на "Сохранить"
        const btn = document.getElementById('btnAddNote');
        btn.textContent = '💾 Save Changes (Сохранить)';
        btn.style.background = 'var(--yellow)';
        btn.style.color = '#000';
        
        // Показываем кнопку отмены
        document.getElementById('btnCancelEditNote').style.display = 'block';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.cancelEditNote = function() {
        editingNoteId = null;
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteBody').value = '';
        
        const btn = document.getElementById('btnAddNote');
        btn.textContent = '+ Add Note (Добавить)';
        btn.style.background = 'linear-gradient(135deg, #0284C7, #38BDF8)';
        btn.style.color = '#fff';
        
        document.getElementById('btnCancelEditNote').style.display = 'none';
    };

    window.deleteNote = function(id) {
        if (!confirm('Удалить эту заметку?')) return;
        let notes = JSON.parse(localStorage.getItem('vessel_notes')) || [];
        notes = notes.filter(n => n.id !== id);
        localStorage.setItem('vessel_notes', JSON.stringify(notes));
        renderNotesList();
    };

    window.renderNotesList = function() {
        const listContainer = document.getElementById('notesList');
        if (!listContainer) return;

        let notes = JSON.parse(localStorage.getItem('vessel_notes')) || [];
        const filter = document.getElementById('noteFilter').value;
        const search = document.getElementById('noteSearch').value.toLowerCase();

        // Фильтрация
        if (filter === 'open') notes = notes.filter(n => !n.isPinned); // Предполагаем, что "open" - это без закрепления
        else if (filter !== 'all') notes = notes.filter(n => n.category === filter);

        // Поиск
        if (search) {
            notes = notes.filter(n => 
                (n.title && n.title.toLowerCase().includes(search)) || 
                (n.body && n.body.toLowerCase().includes(search))
            );
        }

        // Сортировка (закрепленные сверху)
        notes.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return b.timestamp - a.timestamp;
        });

        if (notes.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">Нет заметок</div>';
            return;
        }

        const icons = { 'Inspector': '🔍', 'Superintendent': '👔', 'PhonePrep': '📞', 'Task': '✅', 'General': '📝' };

        listContainer.innerHTML = notes.map(n => {
            const dateStr = new Date(n.timestamp).toLocaleDateString();
            const icon = icons[n.category] || '📝';
            return `
                <div style="background:var(--card); border:1px solid ${n.isPinned ? 'var(--accent)' : 'var(--border)'}; border-radius:12px; padding:12px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                        <div style="font-weight:700; color:var(--text); font-size:0.9rem;">
                            ${icon} ${n.title || '(без названия)'}
                        </div>
                        ${n.isPinned ? '<span style="color:var(--accent); font-size:0.8rem;">📌</span>' : ''}
                    </div>
                    ${n.body ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:10px; white-space:pre-wrap;">${n.body}</div>` : ''}
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:8px; margin-top:8px;">
                        <div style="font-size:0.65rem; color:var(--text-muted);">${n.category} • ${dateStr}</div>
                        <div style="display:flex; gap:6px;">
                            <button class="btn" style="margin:0; padding:4px 8px; width:auto; font-size:0.75rem; background:rgba(56,189,248,0.15); color:var(--accent); border:1px solid rgba(56,189,248,0.3);" onclick="editNote('${n.id}')">✏️</button>
                            <button class="btn-danger" style="padding:4px 8px; font-size:0.75rem;" onclick="deleteNote('${n.id}')">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };

    // Привязка фильтра и поиска к функции отрисовки
    document.getElementById('noteFilter').addEventListener('change', renderNotesList);
    document.getElementById('noteSearch').addEventListener('input', renderNotesList);

    // Первичная отрисовка при загрузке
    setTimeout(renderNotesList, 100);
    // === ИСТОРИЯ НОЧНЫХ ПРИКАЗОВ ===
    document.getElementById('btnSaveNo').addEventListener('click', function() {
        const text = document.getElementById('resNo').innerText;
        if (!text || text.trim() === '') {
            alert('Сначала сгенерируйте приказ!');
            return;
        }

        let history = JSON.parse(localStorage.getItem('vessel_night_orders')) || [];
        history.push({
            id: Date.now().toString(),
            date: new Date().toLocaleDateString(),
            text: text
        });

        localStorage.setItem('vessel_night_orders', JSON.stringify(history));
        renderNightOrderHistory();
        
        // Визуальный отклик
        const btn = this;
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Saved!';
        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
    });

    window.deleteNightOrder = function(id) {
        if (!confirm('Удалить этот приказ из истории?')) return;
        let history = JSON.parse(localStorage.getItem('vessel_night_orders')) || [];
        history = history.filter(item => item.id !== id);
        localStorage.setItem('vessel_night_orders', JSON.stringify(history));
        renderNightOrderHistory();
    };

    window.copyNightOrder = function(id) {
        let history = JSON.parse(localStorage.getItem('vessel_night_orders')) || [];
        const item = history.find(i => i.id === id);
        if (item) {
            navigator.clipboard.writeText(item.text).then(() => {
                alert('Скопировано в буфер обмена!');
            });
        }
    };

    window.renderNightOrderHistory = function() {
        const container = document.getElementById('noHistoryList');
        if (!container) return;

        let history = JSON.parse(localStorage.getItem('vessel_night_orders')) || [];
        
        if (history.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:10px;">История пуста</div>';
            return;
        }

        // Сортируем: новые сверху
        history.sort((a, b) => b.id - a.id);

        container.innerHTML = history.map(item => `
            <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:12px; padding:12px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="font-size:0.75rem; color:var(--accent); font-weight:bold;">Order from: ${item.date}</span>
                    <button class="btn-danger" style="padding:4px 8px; font-size:0.75rem;" onclick="deleteNightOrder('${item.id}')">🗑️</button>
                </div>
                <div style="font-family:monospace; font-size:0.8rem; color:var(--text); white-space:pre-wrap; margin-bottom:12px; padding:10px; background:var(--bg); border-radius:8px;">${item.text}</div>
                <button class="btn" style="margin-top:0; background:var(--border); color:var(--text); padding:8px; font-size:0.8rem;" onclick="copyNightOrder('${item.id}')">📋 Copy</button>
            </div>
        `).join('');
    };

    // Отрисовываем историю при загрузке страницы
    setTimeout(renderNightOrderHistory, 100);
    // === СПРАВОЧНИК КРЕПЕЖА (BOLTS & NUTS) ===
    const boltDatabase = {
        'M3':  { d: 3,  pitchC: 0.5,  pitchF: 0.35, spanner: 5.5, hex: 2.5, drill: 2.5 },
        'M4':  { d: 4,  pitchC: 0.7,  pitchF: 0.5,  spanner: 7,   hex: 3,   drill: 3.3 },
        'M5':  { d: 5,  pitchC: 0.8,  pitchF: 0.5,  spanner: 8,   hex: 4,   drill: 4.2 },
        'M6':  { d: 6,  pitchC: 1.0,  pitchF: 0.75, spanner: 10,  hex: 5,   drill: 5.0 },
        'M8':  { d: 8,  pitchC: 1.25, pitchF: 1.0,  spanner: 13,  hex: 6,   drill: 6.8 },
        'M10': { d: 10, pitchC: 1.5,  pitchF: 1.25, spanner: 17,  hex: 8,   drill: 8.5 },
        'M12': { d: 12, pitchC: 1.75, pitchF: 1.25, spanner: 19,  hex: 10,  drill: 10.2 },
        'M14': { d: 14, pitchC: 2.0,  pitchF: 1.5,  spanner: 22,  hex: 11,  drill: 12.0 },
        'M16': { d: 16, pitchC: 2.0,  pitchF: 1.5,  spanner: 24,  hex: 14,  drill: 14.0 },
        'M18': { d: 18, pitchC: 2.5,  pitchF: 1.5,  spanner: 27,  hex: 14,  drill: 15.5 },
        'M20': { d: 20, pitchC: 2.5,  pitchF: 1.5,  spanner: 30,  hex: 17,  drill: 17.5 },
        'M22': { d: 22, pitchC: 2.5,  pitchF: 1.5,  spanner: 32,  hex: 17,  drill: 19.5 },
        'M24': { d: 24, pitchC: 3.0,  pitchF: 2.0,  spanner: 36,  hex: 19,  drill: 21.0 },
        'M27': { d: 27, pitchC: 3.0,  pitchF: 2.0,  spanner: 41,  hex: 20,  drill: 24.0 },
        'M30': { d: 30, pitchC: 3.5,  pitchF: 2.0,  spanner: 46,  hex: 22,  drill: 26.5 },
        'M33': { d: 33, pitchC: 3.5,  pitchF: 2.0,  spanner: 50,  hex: 24,  drill: 29.5 },
        'M36': { d: 36, pitchC: 4.0,  pitchF: 3.0,  spanner: 55,  hex: 27,  drill: 32.0 },
        'M42': { d: 42, pitchC: 4.5,  pitchF: 3.0,  spanner: 65,  hex: 32,  drill: 37.5 },
        'M48': { d: 48, pitchC: 5.0,  pitchF: 3.0,  spanner: 75,  hex: 38,  drill: 43.0 },
        'M56': { d: 56, pitchC: 5.5,  pitchF: 4.0,  spanner: 85,  hex: 46,  drill: 50.5 },
        'M64': { d: 64, pitchC: 6.0,  pitchF: 4.0,  spanner: 95,  hex: 55,  drill: 58.0 }
    };

    window.renderBoltData = function() {
        const size = document.getElementById('boltSizeSelect').value;
        const data = boltDatabase[size];
        const container = document.getElementById('boltDataContainer');
        
        if (!data || !container) return;

        // Функция для создания строки
        const row = (label, value, unit) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px dashed rgba(255,255,255,0.1);">
                <span style="color:var(--text-muted); font-size:0.85rem;">${label}</span>
                <span style="color:var(--text); font-weight:700; font-size:1rem;">${value} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">${unit}</span></span>
            </div>
        `;

        container.innerHTML = 
            row('Thread diameter', data.d, 'mm') +
            row('Pitch (coarse thread)', data.pitchC, 'mm') +
            row('Pitch (fine thread, JIS)', data.pitchF, 'mm') +
            row('Spanner (ISO and legacy JIS)', data.spanner, 'mm') +
            row('Hex key (socket screw)', data.hex, 'mm') +
            `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0;">
                <span style="color:var(--text-muted); font-size:0.85rem;">Tap drill (coarse thread)</span>
                <span style="color:var(--green); font-weight:800; font-size:1.05rem;">${data.drill} <span style="font-size:0.75rem; color:var(--green); opacity:0.7; font-weight:normal;">mm</span></span>
            </div>`;
    };

    // Первичная отрисовка при загрузке
        setTimeout(renderBoltData, 100);
    // === СПРАВОЧНИК ТРУБ ===
    const pipeDatabase = {
        '15A': { inch: '1/2', dn: 15, jisOD: 21.7, sgpWall: 2.8, asmeOD: 21.34 },
        '20A': { inch: '3/4', dn: 20, jisOD: 27.2, sgpWall: 2.8, asmeOD: 26.67 },
        '25A': { inch: '1', dn: 25, jisOD: 34.0, sgpWall: 3.2, asmeOD: 33.40 },
        '32A': { inch: '1.1/4', dn: 32, jisOD: 42.7, sgpWall: 3.5, asmeOD: 42.16 },
        '40A': { inch: '1.1/2', dn: 40, jisOD: 48.6, sgpWall: 3.5, asmeOD: 48.26 },
        '50A': { inch: '2', dn: 50, jisOD: 60.5, sgpWall: 3.8, asmeOD: 60.33 },
        '65A': { inch: '2.1/2', dn: 65, jisOD: 76.3, sgpWall: 4.2, asmeOD: 73.03 },
        '80A': { inch: '3', dn: 80, jisOD: 89.1, sgpWall: 4.2, asmeOD: 88.90 },
        '100A': { inch: '4', dn: 100, jisOD: 114.3, sgpWall: 4.5, asmeOD: 114.30 },
        '125A': { inch: '5', dn: 125, jisOD: 139.8, sgpWall: 4.5, asmeOD: 141.30 },
        '150A': { inch: '6', dn: 150, jisOD: 165.2, sgpWall: 5.0, asmeOD: 168.28 },
        '200A': { inch: '8', dn: 200, jisOD: 216.3, sgpWall: 5.8, asmeOD: 219.08 },
        '250A': { inch: '10', dn: 250, jisOD: 267.4, sgpWall: 6.6, asmeOD: 273.05 },
        '300A': { inch: '12', dn: 300, jisOD: 318.5, sgpWall: 6.9, asmeOD: 323.85 }
    };

    window.renderPipeData = function() {
        const size = document.getElementById('pipeSizeSelect').value;
        const data = pipeDatabase[size];
        const container = document.getElementById('pipeDataContainer');
        if (!data || !container) return;
        
        const row = (label, value, unit) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px dashed rgba(255,255,255,0.1);">
                <span style="color:var(--text-muted); font-size:0.85rem;">${label}</span>
                <span style="color:var(--text); font-weight:700; font-size:0.95rem;">${value} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">${unit}</span></span>
            </div>`;

        container.innerHTML = 
            row('Inch nominal size and DN', `${data.inch}B • DN ${data.dn}`, '') +
            row('Outside diameter (JIS)', data.jisOD, 'mm') +
            row('Wall and inside diameter (SGP)', `${data.sgpWall} • ${(data.jisOD - data.sgpWall * 2).toFixed(1)}`, 'mm') +
            row('Outside diameter (ASME)', data.asmeOD, 'mm');
    };

    // === КОНВЕРТЕР КООРДИНАТ ===
    window.convertCoords = function() {
        const input = document.getElementById('coordInput').value;
        const resultBox = document.getElementById('coordResult');
        if (!input.includes(',')) { resultBox.style.display = 'none'; return; }
        
        const parts = input.split(',');
        let lat = parseFloat(parts[0].trim());
        let lon = parseFloat(parts[1].trim());
        
        if (isNaN(lat) || isNaN(lon)) { resultBox.style.display = 'none'; return; }

        const formatCoord = (dec, isLat) => {
            const dir = dec >= 0 ? (isLat ? 'N' : 'E') : (isLat ? 'S' : 'W');
            const abs = Math.abs(dec);
            const deg = Math.floor(abs);
            let min = ((abs - deg) * 60).toFixed(1);
            if (min === '60.0') { deg += 1; min = '0.0'; }
            return `${deg}-${min.padStart(4, '0')}${dir}`;
        };

        const noonFormat = `${formatCoord(lat, true)} ${formatCoord(lon, false)}`;
        
        resultBox.style.display = 'block';
        resultBox.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <span style="color:var(--text-muted); font-size:0.85rem;">Noon report format:</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--green); font-size:1.1rem; font-weight:bold;">${noonFormat}</span>
                <button class="btn" style="margin:0; width:auto; padding:6px 12px; font-size:0.8rem;" onclick="navigator.clipboard.writeText('${noonFormat}'); this.textContent='Copied!'; setTimeout(()=>this.textContent='Copy',1500);">Copy</button>
            </div>
        `;
    };

    // Заполняем список болтов динамически и запускаем отрисовку
    setTimeout(() => {
        const boltSelect = document.getElementById('boltSizeSelect');
        if (boltSelect) {
            boltSelect.innerHTML = Object.keys(boltDatabase).map(key => `<option value="${key}">${key}</option>`).join('');
            boltSelect.value = 'M8'; // По умолчанию
        }
        renderBoltData();
        renderPipeData();
    }, 100);
    // === ЖЕЛЕЗОБЕТОННЫЙ ФИКС ПЕРЕНОСА ТЕКСТА В DELIVERY ===
    const deliveryObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                const deliveryTab = document.getElementById('tab-delivery');
                // Ищем абсолютно все инпуты внутри Delivery, кроме чекбоксов
                if (deliveryTab) {
                    const inputs = deliveryTab.querySelectorAll('input');
                    inputs.forEach(input => {
                        // Если это уже textarea или чекбокс — пропускаем
                        if (input.tagName === 'TEXTAREA' || input.type === 'checkbox' || input.type === 'radio' || input.dataset.replaced === 'true') return;

                        // Создаем вместо него textarea
                        const textarea = document.createElement('textarea');
                        textarea.className = input.className;
                        textarea.placeholder = input.placeholder || 'Note...';
                        textarea.value = input.value;
                        textarea.rows = 2;
                        textarea.dataset.replaced = 'true';
                        
                        // Переносим стили, чтобы выглядело как раньше
                        textarea.style.cssText = input.style.cssText;
                        textarea.style.whiteSpace = 'pre-wrap';
                        textarea.style.wordWrap = 'break-word';
                        textarea.style.overflowWrap = 'break-word';
                        textarea.style.resize = 'vertical';
                        textarea.style.minHeight = '45px';
                        textarea.style.marginTop = '5px';
                        textarea.style.fontFamily = 'inherit';
                        textarea.style.fontSize = '0.9rem';

                        // Переносим обработчики событий (сохранение)
                        textarea.onchange = input.onchange;
                        textarea.oninput = input.oninput;
                        textarea.onblur = input.onblur;

                        // Заменяем
                        input.parentNode.replaceChild(textarea, input);
                    });
                }
            }
        });
    });

    // Запускаем слежку за всем документом
    deliveryObserver.observe(document.body, { childList: true, subtree: true });