document.addEventListener('DOMContentLoaded', () => {
    // Bir fonksiyonun çağrılma sıklığını sınırlayan yardımcı fonksiyon (Debounce)
    function debounce(func, delay = 300) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    // DOM elementlerini seçelim
    const searchInput = document.getElementById('searchInput');
    const searchForm = document.getElementById('searchForm');
    const resultsDiv = document.getElementById('results');
    const paginationContainer = document.getElementById('pagination-container');

    // Uygulamanın durumunu yönetecek değişkenler
    let allSentences = [];
    let filteredSentences = [];
    const sentencesPerPage = 10;
    const initialSentencesCount = 5; // Başlangıçta gösterilecek rastgele cümle sayısı

    // JSON dosyasından verileri yükleyen ana fonksiyon
    async function loadSentences() {
        try {
            resultsDiv.innerHTML = '<p class="results-placeholder">Sözlük yükleniyor...</p>';
            const response = await fetch('sentences.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allSentences = await response.json();
            displayInitialView(); // Veriler yüklendiğinde rastgele örnekleri göster
        } catch (error) {
            console.error('Veri yüklenirken bir hata oluştu:', error);
            resultsDiv.innerHTML = `<p class="error">Veriler yüklenemedi. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.</p>`;
        }
    }

    // Metni panoya kopyalayan ve kullanıcıya geri bildirim veren yardımcı fonksiyon
    function displayInitialView() {
        // Dizinin kopyasını karıştırarak orijinal sırayı bozmuyoruz
        const shuffled = [...allSentences].sort(() => 0.5 - Math.random());
        const randomSentences = shuffled.slice(0, initialSentencesCount);

        // Sayfalama olmadan sonuçları render et
        renderResults(randomSentences, 1, '');

        // Sonuçların başına bir başlık ekle
        const title = document.createElement('h2');
        title.textContent = 'Rastgele Örnekler';
        title.classList.add('results-title');
        resultsDiv.prepend(title);
    }
    function copyToClipboard(element, text) {
        navigator.clipboard.writeText(text).then(() => {
            const originalTitle = element.title;
            element.classList.add('copied-feedback');
            element.title = 'Kopyalandı!';

            setTimeout(() => {
                element.classList.remove('copied-feedback');
                element.title = originalTitle;
            }, 1200); // 1.2 saniye sonra eski haline dön
        }).catch(err => {
            console.error('Metin kopyalanamadı: ', err);
        });
    }

    // Arama terimini metin içinde vurgulayan yardımcı fonksiyon
    function highlightText(text, searchTerm) {
        if (!searchTerm) {
            return text;
        }
        // Regex'in bozulmaması için arama terimindeki özel karakterleri escape'liyoruz.
        const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedTerm, 'gi'); // 'g' for global, 'i' for case-insensitive
        return text.replace(regex, (match) => `<mark>${match}</mark>`);
    }

    // Sonuçları ekrana çizen fonksiyon
    function renderResults(sentences, page = 1, searchTerm = '') {
        resultsDiv.replaceChildren(); // Eski sonuçları temizlemenin modern yolu

        if (sentences.length === 0) {
            if (searchTerm) { // Sadece arama yapıldığında ve sonuç bulunamadığında mesaj göster
                resultsDiv.innerHTML = '<p class="results-placeholder">Sonuç bulunamadı.</p>';
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
            turkceP.title = 'Kopyalamak için tıkla';
            turkceP.addEventListener('click', () => copyToClipboard(turkceP, sentence.turkce));

            const arapcaP = document.createElement('p');
            arapcaP.className = 'arapca';
            arapcaP.innerHTML = highlightText(sentence.arapca, searchTerm);
            arapcaP.title = 'للنسخ انقر'; // "Click to copy" in Arabic
            arapcaP.addEventListener('click', () => copyToClipboard(arapcaP, sentence.arapca));

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

    // Çekirdek arama mantığını yürüten fonksiyon
    function performSearch(searchTerm) {
        const term = searchTerm.trim().toLowerCase();

        // Arama kutusu boşsa, başlangıç görünümüne dön
        if (!term) {
            filteredSentences = [];
            displayInitialView();
            paginationContainer.replaceChildren();
            return;
        }
        filteredSentences = allSentences.filter(sentence =>
            sentence.turkce.toLowerCase().includes(term) ||
            sentence.arapca.toLowerCase().includes(term)
        );

        renderResults(filteredSentences, 1, term);
        renderPagination(filteredSentences, 1, term);
    }

    // Arama fonksiyonunun "debounced" versiyonunu oluşturalım
    const debouncedSearch = debounce((event) => performSearch(event.target.value));

    // Form gönderildiğinde (Enter'a basıldığında) anında arama yap
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Sayfanın yeniden yüklenmesini engelle
        performSearch(searchInput.value);
    });

    // Kullanıcı yazdıkça gecikmeli arama yap
    searchInput.addEventListener('input', debouncedSearch);

    // Sayfa yüklendiğinde verileri çek
    loadSentences();
});
