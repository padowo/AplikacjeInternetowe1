function parseTransform(transformString) {
    const match = transformString.match(/translate(?:3d)?\(([^,]+),([^,]+)/);
    if (match) {
        return {
            x: parseFloat(match[1]) || 0,
            y: parseFloat(match[2]) || 0
        };
    }
    return { x: 0, y: 0 };
}

document.addEventListener("DOMContentLoaded", () => {
    
    if (Notification.permission !== 'granted') {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log("Zgoda na powiadomienia udzielona.");
            }
        });
    }

    const mapa = L.map('mapa').setView([52.23, 19.01], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapa);
    
    const przyciskLok = document.getElementById("moja_lokalizacja");
    przyciskLok.addEventListener('click', () => {
        if (navigator.geolocation) {
             navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    mapa.setView([lat, lon], 15);
                    L.marker([lat, lon]).addTo(mapa)
                        .bindPopup("Jesteś tutaj")
                        .openPopup();
                },
                () => {
                    alert("Wystąpił błąd lub nie udzielono zgody na pobranie lokalizacji.");
                }
            )
        } else {
             alert("Twoja przeglądarka nie wspiera geolokalizacji.");
        }
    });

    const przyciskPobierz = document.getElementById('pobierz_mape');
    
    przyciskPobierz.addEventListener('click', () => { 
        setTimeout(async () => { 
            
            const kontenerPuzzli = document.querySelector('.lewy_dolny');
            const kontenerPodgladu = document.getElementById('podglad-mapy');
            const controlsContainer = document.querySelector('.leaflet-control-container');
            
            if (controlsContainer) {
                controlsContainer.style.display = 'none';
            }
            
            await new Promise(resolve => setTimeout(resolve, 50)); 

            kontenerPuzzli.innerHTML = '';
            kontenerPodgladu.innerHTML = '<p>Ładowanie mapy...</p>'; 

            const szerokoscNetto = 480;
            const wysokoscNetto = 480;
            const mainCanvas = document.createElement('canvas');
            mainCanvas.width = szerokoscNetto;
            mainCanvas.height = wysokoscNetto;
            const ctx = mainCanvas.getContext('2d');

            ctx.fillStyle = '#f0f4f8';
            ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);

            const mapPane = document.querySelector('.leaflet-map-pane');
            const tilePane = document.querySelector('.leaflet-tile-pane');
            const tiles = tilePane.querySelectorAll('img');
            const mapPaneOffset = parseTransform(mapPane.style.transform);
            const tilePaneOffset = parseTransform(tilePane.style.transform);

            const tilePromises = [];

            tiles.forEach(tileImgElement => {
                const tileOffset = parseTransform(tileImgElement.style.transform);
                const drawX = mapPaneOffset.x + tilePaneOffset.x + tileOffset.x;
                const drawY = mapPaneOffset.y + tilePaneOffset.y + tileOffset.y;

                const tilePromise = new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.src = tileImgElement.src;

                    img.onload = () => {
                        ctx.drawImage(img, drawX, drawY);
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn(`Nie udało się załadować kafelka: ${img.src}. Pomijanie.`);
                        resolve(); 
                    };
                });
                tilePromises.push(tilePromise);
            });

            try {
                await Promise.all(tilePromises);
            } catch (error) {
                console.error("Błąd podczas ładowania kafelków mapy:", error);
                alert("Błąd: Nie udało się pobrać mapy dla puzzli.");
                kontenerPodgladu.innerHTML = '<p>Błąd ładowania mapy</p>';
                if (controlsContainer) { controlsContainer.style.display = ''; }
                return;
            }

            const obrazUrl = mainCanvas.toDataURL('image/png');
            kontenerPodgladu.innerHTML = '';
            kontenerPodgladu.appendChild(mainCanvas);
            
            if (controlsContainer) {
                controlsContainer.style.display = '';
            }

            const szerokoscPuzzla = szerokoscNetto / 4;
            const wysokoscPuzzla = wysokoscNetto / 4;
            let puzzleDoWymieszania = [];

            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 4; x++) {
                    const fragment = document.createElement('div');
                    fragment.classList.add('fragment-puzzla');
                    fragment.style.backgroundImage = `url(${obrazUrl})`;
                    
                    const xPos = -(x * szerokoscPuzzla);
                    const yPos = -(y * wysokoscPuzzla);
                    fragment.style.backgroundPosition = `${xPos}px ${yPos}px`;

                    fragment.draggable = true;
                    fragment.dataset.index = y * 4 + x;
                    puzzleDoWymieszania.push(fragment);
                }
            }

            puzzleDoWymieszania.sort(() => Math.random() - 0.5);
            
            puzzleDoWymieszania.forEach(fragment => { 
                kontenerPuzzli.appendChild(fragment);
            });

            dodajListeneryDragDrop();

        }, 500); 
    });

    function dodajListeneryDragDrop() {
        const fragmenty = document.querySelectorAll('.fragment-puzzla');
        const miejscaDocelowe = document.querySelectorAll('.prawy_dolny .miejsce_puzzla');
        const kontenerDolny = document.querySelector('.lewy_dolny'); 

        fragmenty.forEach(fragment => {
            fragment.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', fragment.dataset.index);
                setTimeout(() => { fragment.style.opacity = '0.5'; }, 0);
            });
            fragment.addEventListener('dragend', e => {
                fragment.style.opacity = '1';
            });
        });

        miejscaDocelowe.forEach(miejsce => {
            miejsce.addEventListener('dragover', e => {
                e.preventDefault();
            });
            miejsce.addEventListener('dragenter', e => {
                e.preventDefault();
                miejsce.classList.add('drag-over');
            });
            miejsce.addEventListener('dragleave', e => {
                miejsce.classList.remove('drag-over');
            });

            miejsce.addEventListener('drop', e => {
                e.preventDefault();
                miejsce.classList.remove('drag-over');

                const indexFragmentu = e.dataTransfer.getData('text/plain');
                const fragmentPrzeciagany = document.querySelector(`.fragment-puzzla[data-index='${indexFragmentu}']`);
                
                if (!fragmentPrzeciagany) return;

                const fragmentIstniejacy = miejsce.querySelector('.fragment-puzzla');
                const zrodlo = fragmentPrzeciagany.parentElement;

                if (fragmentIstniejacy) {
                    zrodlo.appendChild(fragmentIstniejacy);
                    miejsce.appendChild(fragmentPrzeciagany);
                } else {
                    miejsce.appendChild(fragmentPrzeciagany);
                }
                
                sprawdzWygrana();
            });
        });

        kontenerDolny.addEventListener('dragover', e => {
            e.preventDefault();
        });

        kontenerDolny.addEventListener('drop', e => {
            e.preventDefault();
            const indexFragmentu = e.dataTransfer.getData('text/plain');
            const fragment = document.querySelector(`.fragment-puzzla[data-index='${indexFragmentu}']`);

            if (fragment) {
                kontenerDolny.appendChild(fragment);
            }
            sprawdzWygrana();
        });

        function sprawdzWygrana() {
            const miejscaDocelowe = document.querySelectorAll('.prawy_dolny .miejsce_puzzla');
            let poprawne = 0;

            miejscaDocelowe.forEach(miejsce => {
                const fragment = miejsce.querySelector('.fragment-puzzla');
                if (fragment) {
                    if (fragment.dataset.index === miejsce.dataset.index) {
                        poprawne++;
                    }
                }
            });

            if (poprawne === 16) {
                console.log("wygrana w consollogu");
                if (Notification.permission === "granted") {
                    new Notification('Gratulacje!', {
                        body: 'Udało Ci się poprawnie ułożyć mapę!'
                    });
                } else {
                    alert('WYGRANA! Mapa ułożona poprawnie! (Brak zgody na powiadomienia)');
                }
            }
        }
    }
});