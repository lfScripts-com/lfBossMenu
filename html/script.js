document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('app').style.display = 'none';

    let currentJob = null;
    let jobGrades = [];
    let allEmployees = [];
    let translations = {};

    function t(key, ...args) {
        if (translations[key]) {
            let text = translations[key];
            if (args && args.length > 0) {
                args.forEach((arg, index) => {
                    text = text.replace('%s', arg);
                });
            }
            return text;
        }
        return key;
    }
    const navLinks = document.querySelectorAll('.sidebar ul li a');
    const pages = document.querySelectorAll('.page');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');

            if (page === 'close') {
                fetch(`https://${GetParentResourceName()}/closeUI`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json; charset=UTF-8' }
                });
            } else {
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');

                pages.forEach(p => p.classList.remove('active'));
                document.getElementById(page).classList.add('active');

                if (page === 'employees') {
                    loadJobGrades(() => {
                        loadEmployees();
                    });
                } else if (page === 'grades') {
                    loadGrades();
                } else if (page === 'vehicles') {
                    loadVehicles();
                }
            }
        });
    });

    window.addEventListener('message', function (event) {
        const data = event.data;

        if (data.action === 'open') {
            document.getElementById('app').style.display = 'flex';
            currentJob = data.job;
            if (data.locale) {
                translations = data.locale;
                updateUI();
            }
            loadDashboard();
            updateHeaderImage(currentJob);
            updateColors(data.colors);

            const activePageLink = document.querySelector('.sidebar ul li a.active');
            const activePage = activePageLink ? activePageLink.getAttribute('data-page') : null;

            if (activePage === 'employees') {
                loadJobGrades(() => {
                    loadEmployees();
                });
            } else if (activePage === 'grades') {
                loadGrades();
            } else if (activePage === 'vehicles') {
                loadVehicles();
            }
        } else if (data.action === 'close') {
            document.getElementById('app').style.display = 'none';
        }
    });

    function updateUI() {
        document.querySelector('a[data-page="dashboard"]').textContent = t('menu_dashboard');
        document.querySelector('a[data-page="employees"]').textContent = t('menu_employees');
        document.querySelector('a[data-page="grades"]').textContent = t('menu_grades');
        document.querySelector('a[data-page="vehicles"]').textContent = t('menu_vehicles');
        document.querySelector('a[data-page="close"]').textContent = t('menu_close');
        
        document.querySelector('#dashboard .dashboard-header h2').textContent = t('dashboard_title');
        document.querySelectorAll('#dashboard .card-content p')[0].textContent = t('dashboard_company_name');
        document.querySelectorAll('#dashboard .card-content p')[1].textContent = t('dashboard_employee_count');
        
        document.querySelector('#employees h2').textContent = t('employees_title');
        document.querySelector('#employee-search').placeholder = t('employees_search_placeholder');
        document.querySelector('.sort-container label').textContent = t('employees_sort_label') + ' :';
        document.querySelector('#employee-sort option[value="grade-desc"]').textContent = t('employees_sort_grade_desc');
        document.querySelector('#employee-sort option[value="grade-asc"]').textContent = t('employees_sort_grade_asc');
        document.querySelector('#employee-sort option[value="name-asc"]').textContent = t('employees_sort_name_asc');
        document.querySelector('#employee-sort option[value="name-desc"]').textContent = t('employees_sort_name_desc');
        
        const gradesTitle = document.querySelector('#grades h2');
        if (gradesTitle) {
            gradesTitle.innerHTML = t('grades_title') + ' <span class="salary-max-info">' + t('grades_salary_info') + '</span>';
        }
        
        document.querySelector('#vehicles h2').textContent = t('vehicles_title');
    }

    function updateColors(colors) {
        if (colors) {
            document.documentElement.style.setProperty('--primary-color', colors.primary);
            document.documentElement.style.setProperty('--secondary-color', colors.secondary);
            document.documentElement.style.setProperty('--button-color', colors.button);
            document.documentElement.style.setProperty('--button-hover-color', colors.buttonHover);
        }
    }

    document.addEventListener('keyup', function (e) {
        if (e.key === 'Escape') {
            fetch(`https://${GetParentResourceName()}/closeUI`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                body: JSON.stringify({})
            });
        }
    });

    function loadDashboard() {
        fetch(`https://${GetParentResourceName()}/getDashboardData`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' }
        })
        .then(resp => resp.json())
        .then(data => {
            if (!data) return;
            document.getElementById('company-name').textContent = data.companyName || t('notification_company');
            document.getElementById('employee-count').textContent = data.employeeCount || 0;
        });
    }

    function formatDate(dateVal) {
        if (!dateVal) return '';

        if (typeof dateVal === 'number') {
            const d = new Date(dateVal);
            if (!isNaN(d.getTime())) {
                return d.toLocaleString('fr-FR');
            }
            return dateVal.toString();
        }

        if (Object.prototype.toString.call(dateVal) === '[object Date]') {
            if (!isNaN(dateVal.getTime())) {
                return dateVal.toLocaleString('fr-FR');
            }
            return '';
        }

        if (typeof dateVal === 'string') {
            const cleaned = dateVal.replace('T', ' ');
            const parts = cleaned.split(' ');
            if (parts.length !== 2) {
                const directDate = new Date(dateVal);
                if (!isNaN(directDate.getTime())) {
                    return directDate.toLocaleString('fr-FR');
                }
                return dateVal;
            }
            const datePart = parts[0];
            const timePart = parts[1];
            const [year, month, day] = datePart.split('-');

            if (!year || !month || !day) return dateVal;

            return `${day}/${month}/${year} ${timePart}`;
        }

        return String(dateVal);
    }

    function loadJobGrades(callback) {
        fetch(`https://${GetParentResourceName()}/getJobGrades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' }
        })
        .then(resp => resp.json())
        .then(grades => {
            jobGrades = grades || [];
            if (callback) callback();
        });
    }

    function filterEmployees(employees, searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') return employees;
        const term = searchTerm.toLowerCase().trim();
        return employees.filter(emp => {
            const name = emp.name.toLowerCase();
            const grade = (emp.grade || '').toLowerCase();
            return name.includes(term) || grade.includes(term);
        });
    }

    function sortEmployees(employees, sortType) {
        const gradeMap = {};
        if (jobGrades && jobGrades.length > 0) {
            jobGrades.forEach(g => { gradeMap[g.label] = parseInt(g.grade); });
        }

        const sorted = [...employees];
        
        switch(sortType) {
            case 'grade-desc':
                sorted.sort((a, b) => {
                    const ga = gradeMap[a.grade] ?? -1;
                    const gb = gradeMap[b.grade] ?? -1;
                    return gb - ga;
                });
                break;
            case 'grade-asc':
                sorted.sort((a, b) => {
                    const ga = gradeMap[a.grade] ?? -1;
                    const gb = gradeMap[b.grade] ?? -1;
                    return ga - gb;
                });
                break;
            case 'name-asc':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                sorted.sort((a, b) => b.name.localeCompare(a.name));
                break;
        }
        
        return sorted;
    }

    function displayEmployees(employees) {
        const container = document.querySelector('.employee-cards');
        container.innerHTML = '';
        if (!employees || employees.length === 0) {
            container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 20px;">' + t('employees_no_results') + '</p>';
            return;
        }

        employees.forEach(emp => {
                const card = document.createElement('div');
                card.classList.add('employee-card');
                card.style.position = 'relative';

                let maxGrade = null;
                if (jobGrades && jobGrades.length > 0) {
                    maxGrade = jobGrades.reduce((a, b) => (parseInt(a.grade) > parseInt(b.grade) ? a : b));
                }
                const isHighest = (emp.grade && jobGrades && jobGrades.find(g => g.label === emp.grade && String(g.grade) === String(maxGrade?.grade)));

                const actionButtons = document.createElement('div');
                actionButtons.classList.add('action-buttons');

                const fireButton = document.createElement('button');
                fireButton.classList.add('fire-btn');
                fireButton.dataset.id = emp.identifier;
                fireButton.innerHTML = '<i class="fas fa-trash"></i>';
                fireButton.title = t('employees_fire_button');
                if (isHighest) {
                    fireButton.disabled = true;
                    fireButton.style.opacity = 0.4;
                    fireButton.title = t('employees_fire_disabled');
                }
                fireButton.addEventListener('click', function () {
                    if (isHighest) return;
                    showConfirm(t('employees_fire_confirm', emp.name), () => {
                        const identifier = this.dataset.id;
                        fetch(`https://${GetParentResourceName()}/fireEmployee`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                            body: JSON.stringify({ identifier: identifier })
                        });
                        showNotification(t('employees_fired'));
                        loadEmployees();
                    });
                });
                actionButtons.appendChild(fireButton);
                card.appendChild(actionButtons);

                const name = document.createElement('h3');
                name.textContent = emp.name;
                card.appendChild(name);

                const gradeDisplay = document.createElement('div');
                gradeDisplay.classList.add('grade-display');
                gradeDisplay.dataset.id = emp.identifier;
                gradeDisplay.textContent = emp.grade;

                let gradeOptions = '';
                const sortedJobGrades = [...jobGrades].sort((a, b) => parseInt(b.grade) - parseInt(a.grade));
                sortedJobGrades.forEach(grade => {
                    gradeOptions += `\n  <div class="grade-option" data-grade="${grade.grade}" data-identifier="${emp.identifier}">${grade.label}</div>`;
                });
                const gradeList = document.createElement('div');
                gradeList.classList.add('grade-list');
                gradeList.dataset.id = emp.identifier;
                gradeList.innerHTML = gradeOptions;

                gradeDisplay.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const gradeListMenu = this.parentElement.querySelector('.grade-list');
                    document.querySelectorAll('.grade-list.show').forEach(list => {
                        if (list !== gradeListMenu) list.classList.remove('show');
                    });
                    gradeListMenu.classList.toggle('show');
                });
                document.addEventListener('click', function () {
                    document.querySelectorAll('.grade-list.show').forEach(list => {
                        list.classList.remove('show');
                    });
                });
                gradeList.querySelectorAll('.grade-option').forEach(option => {
                    option.addEventListener('click', function (e) {
                        e.stopPropagation();
                        const grade = this.dataset.grade;
                        const identifier = this.dataset.identifier;
                        const gradeLabel = this.textContent;
                        gradeList.classList.remove('show');
                        const display = card.querySelector(`.grade-display[data-id="${identifier}"]`);
                        if (display) display.textContent = gradeLabel;
                        fetch(`https://${GetParentResourceName()}/updateEmployeeGrade`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                            body: JSON.stringify({ identifier: identifier, grade: grade })
                        });
                        showNotification(t('employees_grade_updated'));
                    });
                });
                card.appendChild(gradeDisplay);
                card.appendChild(gradeList);
                container.appendChild(card);
            });
    }

    function loadEmployees() {
        fetch(`https://${GetParentResourceName()}/getEmployees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' }
        })
        .then(resp => resp.json())
        .then(employees => {
            allEmployees = employees || [];
            applyFiltersAndSort();
        });
    }

    function applyFiltersAndSort() {
        const searchInput = document.getElementById('employee-search');
        const sortSelect = document.getElementById('employee-sort');
        
        const searchTerm = searchInput ? searchInput.value : '';
        const sortType = sortSelect ? sortSelect.value : 'grade-desc';
        
        let filtered = filterEmployees(allEmployees, searchTerm);
        let sorted = sortEmployees(filtered, sortType);
        
        displayEmployees(sorted);
    }

    function initEmployeeFilters() {
        const searchInput = document.getElementById('employee-search');
        const sortSelect = document.getElementById('employee-sort');
        
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                applyFiltersAndSort();
            });
        }
        
        if (sortSelect) {
            sortSelect.addEventListener('change', function() {
                applyFiltersAndSort();
            });
        }
    }

    function loadGrades() {
        fetch(`https://${GetParentResourceName()}/getJobGrades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' }
        })
        .then(resp => resp.json())
        .then(grades => {
            const container = document.querySelector('.grade-cards');
            container.innerHTML = '';
            if (!grades) return;
            grades.sort((a, b) => parseInt(b.grade) - parseInt(a.grade));
            grades.forEach(grade => {
                const card = document.createElement('div');
                card.classList.add('grade-card');

                const name = document.createElement('h3');
                name.textContent = grade.label;
                card.appendChild(name);

                const salaryInput = document.createElement('input');
                salaryInput.type = 'number';
                salaryInput.value = grade.salary;
                salaryInput.min = '50';
                salaryInput.max = '250';
                salaryInput.classList.add('salary-input');
                salaryInput.style.marginLeft = '0';
                salaryInput.style.marginRight = 'auto';
                salaryInput.addEventListener('change', function () {
                    let val = parseInt(salaryInput.value);
                    if (isNaN(val)) return;
                    if (val < 50) {
                        val = 50;
                        salaryInput.value = 50;
                        showNotification(t('grades_salary_min'), true);
                    }
                    if (val > 250) {
                        val = 250;
                        salaryInput.value = 250;
                        showNotification(t('grades_salary_max'), true);
                    }
                    fetch(`https://${GetParentResourceName()}/updateSalary`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                        body: JSON.stringify({ grade: parseInt(grade.grade), salary: val })
                    });
                    showNotification(t('grades_salary_updated'));
                });
                card.appendChild(salaryInput);

                container.appendChild(card);
            });
        });
    }

    function loadVehicles() {
        fetch(`https://${GetParentResourceName()}/getVehicles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' }
        })
        .then(resp => resp.json())
        .then(vehicles => {
            const container = document.querySelector('.vehicle-cards');
            container.innerHTML = '';
            if (!vehicles || vehicles.length === 0) {
                container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-strong); padding: 20px;">' + t('vehicles_no_vehicles') + '</p>';
                return;
            }

            vehicles.forEach(veh => {
                const card = document.createElement('div');
                card.classList.add('vehicle-card');

                const infoDiv = document.createElement('div');
                infoDiv.classList.add('vehicle-info');

                const model = document.createElement('h3');
                let label = veh.model || 'Modèle inconnu';
                fetch(`https://${GetParentResourceName()}/getVehicleLabel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                    body: JSON.stringify({ model: label })
                })
                .then(resp => resp.json())
                .then(vehicleLabel => {
                    model.textContent = vehicleLabel || label;
                });
                infoDiv.appendChild(model);

                const plate = document.createElement('span');
                plate.textContent = t('vehicles_plate', veh.plate || t('vehicles_plate_unknown'));

                infoDiv.appendChild(plate);

                const sellBtn = document.createElement('button');
                sellBtn.classList.add('sell-btn');
                sellBtn.innerHTML = '<i class="fas fa-trash"></i>';
                sellBtn.dataset.plate = veh.plate;

                sellBtn.addEventListener('click', function () {
                    const vehiclePlate = this.dataset.plate;
                    showConfirm(t('vehicles_sell_confirm', veh.plate || t('vehicles_plate_unknown')), () => {
                        fetch(`https://${GetParentResourceName()}/sellVehicle`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                            body: JSON.stringify({ plate: vehiclePlate })
                        })
                        .then(resp => resp.json())
                        .then(data => {
                            if (data.success) {
                                showNotification(t('vehicles_sold'));
                                loadVehicles();
                            } else {
                                showNotification(data.message || t('vehicles_sell_error'), true);
                            }
                        });
                    });
                });

                card.appendChild(infoDiv);
                card.appendChild(sellBtn);

                container.appendChild(card);
            });
        });
    }

    function updateHeaderImage(jobName) {
        const headerImage = document.getElementById('header-image');
        headerImage.src = `images/header_${jobName}.webp`;
    }

    function showNotification(message, isError) {
        const notification = document.getElementById('notification');
        notification.innerText = message;
        notification.classList.add('show');
        if (isError) {
            notification.classList.add('error');
        } else {
            notification.classList.remove('error');
        }
        setTimeout(() => {
            notification.classList.remove('show');
            notification.classList.remove('error');
        }, 3000);
    }

    if (!document.getElementById('confirm-modal')) {
        const confirmModal = document.createElement('div');
        confirmModal.id = 'confirm-modal';
        confirmModal.innerHTML = `
            <div class="confirm-backdrop"></div>
            <div class="confirm-box">
                <div class="confirm-message"></div>
            <div class="confirm-actions">
                <button class="confirm-yes"></button>
                <button class="confirm-no"></button>
            </div>
            </div>
        `;
        document.body.appendChild(confirmModal);
    }
    function showConfirm(message, onYes) {
        const modal = document.getElementById('confirm-modal');
        modal.style.display = 'flex';
        modal.querySelector('.confirm-message').textContent = message;
        const yesBtn = modal.querySelector('.confirm-yes');
        const noBtn = modal.querySelector('.confirm-no');
        yesBtn.textContent = t('notification_yes');
        noBtn.textContent = t('notification_no');
        function cleanup() {
            modal.style.display = 'none';
            yesBtn.removeEventListener('click', yesHandler);
            noBtn.removeEventListener('click', noHandler);
        }
        function yesHandler() { cleanup(); onYes(); }
        function noHandler() { cleanup(); }
        yesBtn.addEventListener('click', yesHandler);
        noBtn.addEventListener('click', noHandler);
    }
    
    initEmployeeFilters();
});
