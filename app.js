// Elementos da Interface
const btnWrite = document.getElementById('btn-write');
const btnRead = document.getElementById('btn-read');
const writeSection = document.getElementById('write-section');
const readSection = document.getElementById('read-section');
const ideaInput = document.getElementById('idea-input');
const btnSave = document.getElementById('btn-save');
const feedbackMsg = document.getElementById('feedback-msg');
const ideasList = document.getElementById('ideas-list');

const charCounter = document.getElementById('char-counter');
const maxLength = 280;

ideaInput.addEventListener('input', () => {
    const currentLength = ideaInput.value.length;
    charCounter.textContent = `${currentLength} / ${maxLength}`;
    
    // Muda a cor para vermelho se chegar no limite
    if (currentLength >= maxLength) {
        charCounter.style.color = '#e74c3c';
    } else {
        charCounter.style.color = '#888';
    }
});

// Navegação (Alternar entre Escrever e Ler)
btnWrite.addEventListener('click', () => {
    writeSection.classList.remove('hidden');
    readSection.classList.add('hidden');
    btnWrite.classList.add('active');
    btnRead.classList.remove('active');
});

btnRead.addEventListener('click', () => {
    writeSection.classList.add('hidden');
    readSection.classList.remove('hidden');
    btnRead.classList.add('active');
    btnWrite.classList.remove('active');
    loadIdeas(); // Carrega as ideias sempre que a aba for aberta
});

// Salvar a Ideia
btnSave.addEventListener('click', () => {
    const text = ideaInput.value.trim();
    if (!text) return; // Não salva se estiver vazio

    // Cria o objeto da ideia
    const newIdea = {
        id: Date.now(),
        content: text,
        date: new Date().toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit'
        })
    };

    // Busca ideias antigas ou cria um array vazio
    const savedIdeas = JSON.parse(localStorage.getItem('gnoteca_ideas')) || [];
    
    // Adiciona a nova ideia no topo da lista
    savedIdeas.unshift(newIdea);

    // Salva no LocalStorage (FUTURO: Aqui enviaremos para o Firebase/Firestore)
    localStorage.setItem('gnoteca_ideas', JSON.stringify(savedIdeas));

    // Limpa o campo e dá feedback
    ideaInput.value = '';
    feedbackMsg.classList.remove('hidden');
    setTimeout(() => {
        feedbackMsg.classList.add('hidden');
    }, 2000);
});

// Carregar e exibir as Ideias
function loadIdeas() {
    ideasList.innerHTML = ''; // Limpa a lista atual
    const savedIdeas = JSON.parse(localStorage.getItem('gnoteca_ideas')) || [];

    if (savedIdeas.length === 0) {
        ideasList.innerHTML = '<p style="text-align:center; color:#888;">Nenhum fragmento salvo ainda. Comece a escrever!</p>';
        return;
    }

    // Renderiza cada ideia na tela
    savedIdeas.forEach(idea => {
        const card = document.createElement('div');
        card.className = 'idea-card';
        card.innerHTML = `
            <span class="idea-date">${idea.date}</span>
            <p>${idea.content.replace(/\n/g, '<br>')}</p>
        `;
        ideasList.appendChild(card);
    });
}