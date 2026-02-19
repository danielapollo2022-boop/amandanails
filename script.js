document.addEventListener('DOMContentLoaded', () => {
    
    // ======================================================
    // 1. TEMA E MENU MOBILE (VISUAL)
    // ======================================================
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    const icon = themeToggleBtn.querySelector('i');

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        htmlElement.setAttribute('data-theme', savedTheme);
        updateIcon(savedTheme);
    }

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcon(newTheme);
    });

    function updateIcon(theme) {
        if (theme === 'dark') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            const isFlex = navLinks.style.display === 'flex';
            navLinks.style.display = isFlex ? 'none' : 'flex';
            
            if (!isFlex) {
                navLinks.style.flexDirection = 'column';
                navLinks.style.position = 'absolute';
                navLinks.style.top = '70px';
                navLinks.style.right = '20px';
                navLinks.style.background = 'var(--glass-bg)';
                navLinks.style.padding = '1rem';
                navLinks.style.borderRadius = '10px';
                navLinks.style.border = '1px solid var(--glass-border)';
            }
        });
    }

    // ======================================================
    // 2. TABELA DE PREÇOS DINÂMICA
    // ======================================================
    async function carregarTabelaPrecos() {
        const tabela = document.getElementById('tabela-precos-dinamica');
        if (!tabela) return;

        try {
            const { collection, getDocs, query, orderBy } = window.firestoreTools;
            const db = window.db;

            const q = query(collection(db, "servicos"), orderBy("ordem", "asc"));
            const querySnapshot = await getDocs(q);
            
            tabela.innerHTML = ''; 

            if (querySnapshot.empty) {
                tabela.innerHTML = '<tr><td colspan="2" style="text-align: center;">Nenhum serviço disponível.</td></tr>';
                return;
            }

            querySnapshot.forEach((doc) => {
                const item = doc.data();
                const badge = item.popular ? '<span class="badge">Popular</span>' : '';
                
                const row = `
                    <tr>
                        <td>${item.nome} ${badge}</td>
                        <td>R$ ${item.preco}</td>
                    </tr>
                `;
                tabela.innerHTML += row;
            });
        } catch (error) {
            console.error("Erro ao carregar preços:", error);
            tabela.innerHTML = '<tr><td colspan="2" style="text-align: center; color: red;">Erro ao carregar os valores.</td></tr>';
        }
    }

    // ======================================================
    // 3. SISTEMA DE AGENDAMENTO (DATAS + FIREBASE)
    // ======================================================
    const timeGrid = document.getElementById('time-grid');
    const dateContainer = document.getElementById('date-scroll');
    const bookingForm = document.getElementById('booking-form');
    const bookingConfirmation = document.getElementById('booking-confirmation');
    const selectedTimeDisplay = document.getElementById('selected-time');

    let selectedDateValue = null; 
    let selectedDateVisual = null; 
    let selectedTimeValue = null; 

    function renderizarDatas() {
        if (!dateContainer) return;
        dateContainer.innerHTML = ''; 
        const hoje = new Date();
        let diasGerados = 0;
        
        for (let i = 0; diasGerados < 10; i++) {
            const dataFutura = new Date(hoje);
            dataFutura.setDate(hoje.getDate() + i);
            if (dataFutura.getDay() === 0) continue;

            const ano = dataFutura.getFullYear();
            const mes = (dataFutura.getMonth() + 1).toString().padStart(2, '0');
            const dia = dataFutura.getDate().toString().padStart(2, '0');
            const dataIso = `${ano}-${mes}-${dia}`;
            const diaSemana = dataFutura.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
            const dataCurta = dataFutura.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

            const card = document.createElement('div');
            card.classList.add('date-card');
            
            if (diasGerados === 0 && !selectedDateValue) {
                card.classList.add('selected');
                selectedDateValue = dataIso;
                selectedDateVisual = dataCurta;
            }

            card.innerHTML = `<span>${diaSemana}</span><strong>${dataCurta}</strong>`;

            card.addEventListener('click', () => {
                document.querySelectorAll('.date-card').forEach(d => d.classList.remove('selected'));
                card.classList.add('selected');
                selectedDateValue = dataIso;
                selectedDateVisual = dataCurta;
                selectedTimeValue = null; 
                if(bookingConfirmation) bookingConfirmation.classList.add('hidden');
                carregarAgendaDoDia();
            });

            dateContainer.appendChild(card);
            diasGerados++;
        }
    }

    async function carregarAgendaDoDia() {
        if (!timeGrid || !selectedDateValue) return;
        timeGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; opacity: 0.7;">A verificar disponibilidade...</p>';

        try {
            const { collection, getDocs, query, where } = window.firestoreTools;
            const db = window.db;

            const q = query(
                collection(db, "agendamentos"), 
                where("data", "==", selectedDateValue)
            );

            const querySnapshot = await getDocs(q);
            const horariosOcupados = [];
            querySnapshot.forEach((doc) => horariosOcupados.push(doc.data().horario));

            timeGrid.innerHTML = '';
            const startHour = 9;
            const endHour = 19;

            for (let hour = startHour; hour <= endHour; hour++) {
                const timeString = `${hour.toString().padStart(2, '0')}:00`;
                const button = document.createElement('div');
                
                if (horariosOcupados.includes(timeString)) {
                    button.innerText = "Ocupado";
                    button.classList.add('time-slot', 'ocupado');
                } else {
                    button.innerText = timeString;
                    button.classList.add('time-slot');
                    button.addEventListener('click', function() {
                        document.querySelectorAll('.time-slot').forEach(slot => slot.classList.remove('selected'));
                        this.classList.add('selected');
                        selectedTimeValue = timeString;
                        if (bookingConfirmation) {
                            bookingConfirmation.classList.remove('hidden');
                            selectedTimeDisplay.innerText = `${selectedDateVisual} às ${timeString}`;
                        }
                    });
                }
                timeGrid.appendChild(button);
            }
        } catch (error) {
            console.error("Erro ao carregar agenda:", error);
            timeGrid.innerHTML = '<p style="color: red;">Erro ao conectar com a agenda.</p>';
        }
    }

    if (bookingForm) {
        bookingForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (!selectedTimeValue || !selectedDateValue) {
                alert("Por favor, selecione um DIA e um HORÁRIO.");
                return;
            }

            const btnSubmit = bookingForm.querySelector('button[type="submit"]');
            const originalText = btnSubmit.innerText;
            btnSubmit.innerText = 'A processar...';
            btnSubmit.disabled = true;

            const dadosAgendamento = {
                nome: document.getElementById('name').value,
                telefone: document.getElementById('phone').value,
                servico: document.getElementById('service').value,
                data: selectedDateValue,       
                data_visual: selectedDateVisual, 
                horario: selectedTimeValue,
                criado_em: new Date().toISOString()
            };

            try {
                await emailjs.send('service_8h57c56', 'template_zpokwji', dadosAgendamento);
                const { collection, addDoc } = window.firestoreTools;
                await addDoc(collection(window.db, "agendamentos"), dadosAgendamento);

                alert(`Agendamento confirmado para ${selectedDateVisual} às ${selectedTimeValue}!`);
                bookingForm.reset();
                bookingConfirmation.classList.add('hidden');
                selectedTimeValue = null;
                document.querySelectorAll('.time-slot').forEach(slot => slot.classList.remove('selected'));
                carregarAgendaDoDia();
            } catch (err) {
                console.error('Erro no envio:', err);
                alert('Houve um erro ao agendar. Tente novamente.');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerText = originalText;
            }
        });
    }

    // ======================================================
    // 4. CARREGAR GALERIA DE FOTOS DINÂMICA
    // ======================================================
    async function carregarGaleria() {
        const galeriaContainer = document.getElementById('galeria-dinamica');
        if (!galeriaContainer) return;

        try {
            const { collection, getDocs, query, orderBy } = window.firestoreTools;
            const db = window.db;

            // Busca as fotos ordenando da mais recente para a mais antiga
            const q = query(collection(db, "galeria"), orderBy("data_upload", "desc"));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                galeriaContainer.innerHTML = '<p style="font-size: 1.2rem; opacity: 0.7;">Nenhuma fotografia foi encontrada.</p>';
                return;
            }

            galeriaContainer.innerHTML = ''; // Limpa a mensagem padrão

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                // Reaproveita as classes CSS para o Instagram Grid
                const itemHTML = `
                    <a href="${data.url}" target="_blank" class="insta-item">
                        <img src="${data.url}" alt="Nail Art Amanda Nails">
                        <div class="insta-overlay">
                            <i class="fab fa-instagram"></i>
                        </div>
                    </a>
                `;
                galeriaContainer.innerHTML += itemHTML;
            });
        } catch (error) {
            console.error("Erro ao carregar a galeria:", error);
            galeriaContainer.innerHTML = '<p style="color: red;">Erro ao carregar as fotografias.</p>';
        }
    }

    // Inicialização
    renderizarDatas();     
    setTimeout(carregarAgendaDoDia, 500); 
    carregarTabelaPrecos(); 
    carregarGaleria(); // Adicionado aqui para executar na abertura da página

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                if (window.innerWidth <= 768 && navLinks) navLinks.style.display = 'none';
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});