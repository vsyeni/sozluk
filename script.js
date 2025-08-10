document.addEventListener('DOMContentLoaded', () => {
    // DOM elementlerini seçelim
    const searchInput = document.getElementById('searchInput');
    const searchForm = document.getElementById('searchForm');
    const resultsDiv = document.getElementById('results');
    const paginationContainer = document.getElementById('pagination-container');
    const initialPlaceholder = document.querySelector('.results-placeholder');

    // Uygulamanın durumunu yönetecek değişkenler
    let allSentences = [];
    let filteredSentences = [];
    const sentencesPerPage = 10;

    // JSON dosyasından verileri yükleyen ana fonksiyon
    async function loadSentences() {
        try {
            const response = await fetch('sentences.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allSentences = await response.json();
            filteredSentences = []; // Başlangıçta filtrelenmiş liste boş
        } catch (error) {
            console.error('Veri yüklenirken bir hata oluştu:', error);
            resultsDiv.innerHTML = `<p class="error">Veriler yüklenemedi. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.</p>`;
        }
    }

    // Arama terimini metin içinde vurgulayan yardımcı fonksiyon
    function highlightText(text, searchTerm) {
        if (!searchTerm) {
            return text;
        }
        // Regex'in bozulmaması için arama terimindeki özel karakterleri escape'liyoruz.
        const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Sadece tam kelime eşleşmelerini vurgula
        const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');
        return text.replace(regex, (match) => `<mark>${match}</mark>`);
    }

    // Sonuçları ekrana çizen fonksiyon
    function renderResults(sentences, page = 1, searchTerm = '') {
        resultsDiv.replaceChildren(); // Eski sonuçları temizlemenin modern yolu

        if (sentences.length === 0) {
            if (searchTerm) { // Arama yapıldı ama sonuç yoksa
                resultsDiv.innerHTML = '<p class="results-placeholder">Sonuç bulunamadı.</p>';
            } else { // Başlangıç durumu veya arama kutusu boşsa
                resultsDiv.appendChild(initialPlaceholder);
            }
            return;
        }

        const start = (page - 1) * sentencesPerPage;
        const end = start + sentencesPerPage;
        const paginatedSentences = sentences.slice(start, end);

        paginatedSentences.forEach(sentence => {
            const sentenceCard = document.createElement('div');
            sentenceCard.className = 'sentence-card';

            const turkceP = document.createElement('p');
            turkceP.className = 'turkce';
            turkceP.innerHTML = highlightText(sentence.turkce, searchTerm);

            const arapcaP = document.createElement('p');
            arapcaP.className = 'arapca';
            arapcaP.innerHTML = highlightText(sentence.arapca, searchTerm);

            sentenceCard.appendChild(turkceP);
            sentenceCard.appendChild(arapcaP);
            resultsDiv.appendChild(sentenceCard);
        });
    }
    
    // Sayfalama (pagination) butonlarını oluşturan fonksiyon
    function renderPagination(sentences, currentPage, searchTerm) {
        paginationContainer.replaceChildren();
        const pageCount = Math.ceil(sentences.length / sentencesPerPage);

        if (pageCount <= 1) return;

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.classList.add('pagination-button');
            if (i === currentPage) {
                btn.classList.add('active');
            }
            btn.addEventListener('click', () => {
                renderResults(sentences, i, searchTerm);
                renderPagination(sentences, i, searchTerm); // Butonların durumunu güncelle
            });
            paginationContainer.appendChild(btn);
        }
    }

    // Arama işlemini yöneten fonksiyon (GÜNCELLENDİ)
    function handleSearch(event) {
        event.preventDefault();
        const searchTerm = searchInput.value.trim();

        if (!searchTerm) {
            filteredSentences = [];
        } else {
            // Arama terimini regex'e uygun şekilde güvenli yap
            const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const wordRegex = new RegExp(`\\b${escapedTerm}\\b`, 'i'); // sadece tam kelime eşleşmesi

            filteredSentences = allSentences.filter(sentence =>
                wordRegex.test(sentence.turkce) ||
                wordRegex.test(sentence.arapca)
            );
        }

        renderResults(filteredSentences, 1, searchTerm);
        renderPagination(filteredSentences, 1, searchTerm);
    }

    // Arama kutusu temizlendiğinde sonuçları sıfırla
    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim() === '') {
            filteredSentences = [];
            renderResults(filteredSentences, 1, '');
            renderPagination(filteredSentences, 1, '');
        }
    });

    // Form gönderildiğinde arama yap
    searchForm.addEventListener('submit', handleSearch);

    // Sayfa yüklendiğinde verileri çek
    loadSentences();

});
