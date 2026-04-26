/* CDBets — vanilla JS app for LB Phone */

(function () {
    'use strict';

    /* =========================================================
     *  Utilities
     * ========================================================= */
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

    function el(tag, props, children) {
        const node = document.createElement(tag);
        if (props) {
            for (const key in props) {
                const val = props[key];
                if (val == null || val === false) continue;
                if (key === 'class') node.className = val;
                else if (key === 'html') node.innerHTML = val;
                else if (key === 'text') node.textContent = val;
                else if (key === 'style' && typeof val === 'object') Object.assign(node.style, val);
                else if (key.slice(0, 2) === 'on' && typeof val === 'function') node.addEventListener(key.slice(2).toLowerCase(), val);
                else if (key === 'dataset' && typeof val === 'object') {
                    for (const dk in val) node.dataset[dk] = val[dk];
                } else node.setAttribute(key, val);
            }
        }
        if (children != null) appendChildren(node, children);
        return node;
    }

    function appendChildren(node, children) {
        if (Array.isArray(children)) {
            children.forEach((c) => appendChildren(node, c));
        } else if (children instanceof Node) {
            node.appendChild(children);
        } else if (children !== false && children != null) {
            node.appendChild(document.createTextNode(String(children)));
        }
    }

    function formatBRL(value) {
        return Number(value).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
        });
    }

    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

    /* =========================================================
     *  Balance store (mirror of use-balance.tsx)
     * ========================================================= */
    const BALANCE_KEY = 'cdbets:balance';
    const FIRST_DEPOSIT_KEY = 'cdbets:firstDepositDone';
    const INITIAL_BALANCE = 1000;
    const WELCOME_BONUS_PERCENT = 500;
    const WELCOME_BONUS_MAX = 1000;

    const balanceListeners = new Set();

    function readBalance() {
        const raw = localStorage.getItem(BALANCE_KEY);
        if (raw === null) return INITIAL_BALANCE;
        const n = Number(raw);
        return Number.isFinite(n) ? n : INITIAL_BALANCE;
    }
    function readFirstDepositDone() {
        return localStorage.getItem(FIRST_DEPOSIT_KEY) === 'true';
    }
    function writeBalance(value) {
        localStorage.setItem(BALANCE_KEY, String(Math.max(0, Math.floor(value))));
        balanceListeners.forEach((l) => l());
    }
    function writeFirstDepositDone(value) {
        localStorage.setItem(FIRST_DEPOSIT_KEY, value ? 'true' : 'false');
        balanceListeners.forEach((l) => l());
    }

    const balance = {
        get value() { return readBalance(); },
        get firstDepositDone() { return readFirstDepositDone(); },
        adjust(delta) { writeBalance(readBalance() + delta); },
        set(v) { writeBalance(v); },
        reset() { writeBalance(INITIAL_BALANCE); writeFirstDepositDone(false); },
        deposit(amount) {
            const safe = Math.max(0, Math.floor(amount));
            if (safe <= 0) return { credited: 0, bonus: 0, applied: false };
            const isFirst = !readFirstDepositDone();
            const bonus = isFirst
                ? Math.min(Math.floor((safe * WELCOME_BONUS_PERCENT) / 100), WELCOME_BONUS_MAX)
                : 0;
            const credited = safe + bonus;
            writeBalance(readBalance() + credited);
            if (isFirst) writeFirstDepositDone(true);
            return { credited, bonus, applied: isFirst };
        },
        withdraw(amount) {
            const safe = Math.max(0, Math.floor(amount));
            if (safe <= 0) return false;
            if (readBalance() < safe) return false;
            writeBalance(readBalance() - safe);
            return true;
        },
        subscribe(fn) {
            balanceListeners.add(fn);
            return () => balanceListeners.delete(fn);
        },
    };

    if (localStorage.getItem(BALANCE_KEY) === null) writeBalance(INITIAL_BALANCE);

    /* =========================================================
     *  Top bar + bottom nav binding
     * ========================================================= */
    function refreshBalancePill() {
        const pill = $('#balance-pill');
        if (pill) pill.textContent = formatBRL(balance.value);
    }
    balance.subscribe(refreshBalancePill);
    refreshBalancePill();

    $$('.nav-item').forEach((btn) => {
        btn.addEventListener('click', () => navigate(btn.dataset.route));
    });

    function refreshNavActive(route) {
        $$('.nav-item').forEach((btn) => {
            const r = btn.dataset.route;
            const active = (r === '/' && route === '/') || (r !== '/' && route.startsWith(r));
            btn.classList.toggle('active', active);
        });
    }

    /* =========================================================
     *  Router
     * ========================================================= */
    const routes = {
        '/': renderHome,
        '/jogos': renderJogosHub,
        '/jogos/slots': renderSlots,
        '/jogos/roleta': renderRoleta,
        '/jogos/mines': renderMines,
        '/carteira': renderCarteira,
        '/perfil': renderPerfil,
    };

    function getRoute() {
        const hash = location.hash.replace(/^#/, '') || '/';
        return hash in routes ? hash : '/';
    }

    function navigate(route) {
        if (location.hash !== '#' + route) {
            location.hash = route;
        } else {
            renderRoute();
        }
    }

    function renderRoute() {
        const route = getRoute();
        const view = $('#view');
        view.innerHTML = '';
        const node = el('div', { class: 'view' });
        view.appendChild(node);
        view.scrollTop = 0;
        refreshNavActive(route);
        try {
            routes[route](node);
        } catch (err) {
            console.error(err);
            node.appendChild(el('div', { class: 'section', text: 'Erro ao renderizar.' }));
        }
    }

    window.addEventListener('hashchange', renderRoute);

    /* =========================================================
     *  Views
     * ========================================================= */

    /* ---- Home ---- */
    function renderHome(root) {
        // Hero banner
        const hero = el('section', { class: 'section' }, [
            el('div', { class: 'card-panel glow-radial hero' }, [
                el('div', { class: 'glow-blob tr' }),
                el('div', { class: 'glow-blob tl' }),
                el('div', { class: 'tag-row' }, [
                    el('span', { class: 'tag-dot' }),
                    el('span', { class: 'tag', text: 'Oferta Limitada' }),
                ]),
                el('h1', {}, [
                    'Bônus de',
                    el('br'),
                    el('span', { class: 'shimmer', text: '500%' }),
                    ' ',
                    el('span', { class: 'gold', text: '+ giros' }),
                ]),
                el('p', { text: 'Saque rápido • PIX em segundos' }),
                el('div', { style: { marginTop: '12px' } }, [
                    el('button', {
                        class: 'btn btn-neon',
                        type: 'button',
                        onClick: () => navigate('/carteira'),
                    }, 'Resgatar bônus'),
                ]),
            ]),
        ]);
        root.appendChild(hero);

        // Featured games
        const games = [
            { name: 'Slots', emoji: '🎰', tag: 'HOT', to: '/jogos/slots' },
            { name: 'Roleta', emoji: '🎡', tag: 'TOP', to: '/jogos/roleta' },
            { name: 'Mines', emoji: '💣', tag: 'NEW', to: '/jogos/mines' },
        ];
        const gamesSection = el('section', { class: 'section' }, [
            el('div', { class: 'row-between' }, [
                el('div', {}, [
                    el('h2', { class: 'section-heading', text: 'Jogos em destaque' }),
                    el('div', { class: 'section-sub', text: 'Selecionados para você' }),
                ]),
                el('button', { class: 'link-accent', type: 'button', onClick: () => navigate('/jogos'), text: 'Ver todos →' }),
            ]),
            el('div', { class: 'games-grid' }, games.map((g) =>
                el('button', {
                    class: 'game-card',
                    type: 'button',
                    onClick: () => navigate(g.to),
                }, [
                    el('div', { class: 'glow' }),
                    g.tag ? el('span', { class: 'tag-pill', text: g.tag }) : null,
                    el('div', { class: 'emoji', text: g.emoji }),
                    el('div', { class: 'name', text: g.name }),
                    el('div', { class: 'sub', text: 'Jogar agora' }),
                ]),
            )),
        ]);
        root.appendChild(gamesSection);

        // Last winners (live)
        const winners = [
            { user: 'Lucas_R', game: 'Slots', amount: '12.450', avatar: '🦊' },
            { user: 'Pedro_X', game: 'Roleta', amount: '8.900', avatar: '🦁' },
            { user: 'Ana_K', game: 'Slots', amount: '5.670', avatar: '🐻' },
            { user: 'Marina.S', game: 'Roleta', amount: '3.200', avatar: '🐱' },
        ];
        const winnersSection = el('section', { class: 'section' }, [
            el('div', { class: 'row-between', style: { marginBottom: '8px' } }, [
                el('div', {}, [
                    el('h2', { class: 'section-heading', text: 'Últimos ganhadores' }),
                    el('div', { class: 'section-sub', text: 'Hall da fama' }),
                ]),
                el('span', { class: 'live-tag' }, [el('span', { class: 'pulse' }), 'AO VIVO']),
            ]),
            el('div', { class: 'winners' }, winners.map((w) =>
                el('div', { class: 'winner-row' }, [
                    el('div', { class: 'left' }, [
                        el('div', { class: 'avatar', text: w.avatar }),
                        el('div', {}, [
                            el('div', { class: 'name', text: w.user }),
                            el('div', { class: 'game', text: w.game }),
                        ]),
                    ]),
                    el('div', {}, [
                        el('div', { class: 'amt', text: '+R$ ' + w.amount }),
                        el('div', { class: 'ago', text: 'Ganhou' }),
                    ]),
                ]),
            )),
        ]);
        root.appendChild(winnersSection);
    }

    /* ---- Jogos hub ---- */
    function renderJogosHub(root) {
        root.appendChild(el('section', { class: 'section' }, [
            el('div', { class: 'row-between', style: { marginBottom: '12px' } }, [
                el('div', {}, [
                    el('h1', { class: 'section-heading', style: { fontSize: '15px' }, text: 'Jogos' }),
                    el('div', { class: 'section-sub' }, [
                        'Saldo: ',
                        el('span', { style: { color: 'var(--gold)', fontWeight: '700' }, text: formatBRL(balance.value) }),
                    ]),
                ]),
            ]),

            // Featured: Slots
            el('button', {
                class: 'featured-game',
                type: 'button',
                onClick: () => navigate('/jogos/slots'),
            }, [
                el('div', { class: 'glow-blob tr' }),
                el('div', { class: 'row' }, [
                    el('div', { class: 'icon-box' }, [el('span', { text: '🎰' })]),
                    el('div', { style: { flex: '1' } }, [
                        el('div', { class: 'stick', text: 'Destaque' }),
                        el('h2', { text: 'Slots' }),
                        el('p', { text: 'Gire os 3 rolos e ganhe até 50x' }),
                    ]),
                    el('span', { class: 'arrow', text: '→' }),
                ]),
            ]),

            // Roleta + Mines
            el('div', { class: 'secondary-grid' }, [
                el('button', {
                    class: 'secondary-game',
                    type: 'button',
                    onClick: () => navigate('/jogos/roleta'),
                }, [
                    el('span', { class: 'stick', text: 'Top' }),
                    el('span', { class: 'emoji', text: '🎡' }),
                    el('span', { class: 'name', text: 'Roleta' }),
                ]),
                el('button', {
                    class: 'secondary-game',
                    type: 'button',
                    onClick: () => navigate('/jogos/mines'),
                }, [
                    el('span', { class: 'stick', text: 'Hot' }),
                    el('span', { class: 'emoji', text: '💣' }),
                    el('span', { class: 'name', text: 'Mines' }),
                ]),
            ]),
        ]));
    }

    /* ---- Game header (used by slots/roleta/mines) ---- */
    function gameHeader(title, emoji) {
        return el('div', { class: 'game-header' }, [
            el('button', { class: 'back-btn', type: 'button', 'aria-label': 'Voltar', onClick: () => navigate('/jogos'), text: '←' }),
            el('div', { class: 'title' }, [
                el('span', { text: emoji }),
                el('h1', { text: title }),
            ]),
            el('div', { class: 'balance-pill' }, [
                el('span', { class: 'gem', text: '💎' }),
                el('span', { text: formatBRL(balance.value) }),
            ]),
        ]);
    }

    /* ---- Mines ---- */
    function renderMines(root) {
        const GRID_SIZE = 25;
        const MINES_OPTIONS = [3, 5, 7, 10];
        const BET_AMOUNTS = [10, 25, 50, 100];

        const state = {
            bet: 25,
            mines: 3,
            board: buildBoard(3),
            active: false,
            picks: 0,
            exploded: false,
            message: { text: 'Configure sua aposta e comece', tone: 'info' },
        };

        function buildBoard(mines) {
            const b = Array.from({ length: GRID_SIZE }, () => ({ revealed: false, isMine: false }));
            const positions = new Set();
            while (positions.size < mines) positions.add(Math.floor(Math.random() * GRID_SIZE));
            positions.forEach((p) => (b[p].isMine = true));
            return b;
        }
        function multiplierFor(picks, mines) {
            if (picks === 0) return 1;
            const safe = GRID_SIZE - mines;
            let m = 1;
            for (let i = 0; i < picks; i++) m *= (GRID_SIZE - i) / (safe - i);
            return m * 0.97;
        }

        root.appendChild(gameHeader('Mines', '💣'));

        const stage = el('div', { class: 'section', style: { padding: '0 12px 12px' } });
        root.appendChild(stage);

        function paint() {
            stage.innerHTML = '';
            const currentMul = multiplierFor(state.picks, state.mines);
            const nextMul = multiplierFor(state.picks + 1, state.mines);
            const currentPay = Math.floor(state.bet * currentMul);
            const nextPay = Math.floor(state.bet * nextMul);

            // Stats
            stage.appendChild(el('div', { class: 'stats-row' }, [
                statBox('Multiplicador', currentMul.toFixed(2) + 'x'),
                statBox('Atual', formatBRL(currentPay), true),
                statBox('Próximo', state.active ? formatBRL(nextPay) : '—'),
            ]));

            // Board
            const board = el('div', { class: 'mines-board glow-radial' }, [
                el('div', { class: 'mines-grid' }, state.board.map((cell, i) => {
                    const cls = ['mine-cell'];
                    if (cell.revealed) cls.push(cell.isMine ? 'bomb' : 'gem');
                    const btn = el('button', {
                        class: cls.join(' '),
                        type: 'button',
                        disabled: !state.active || cell.revealed,
                        onClick: () => revealCell(i),
                    });
                    if (cell.revealed) {
                        btn.appendChild(el('span', { class: 'reveal', text: cell.isMine ? '💣' : '💎' }));
                    }
                    return btn;
                })),
            ]);
            stage.appendChild(board);

            // Message
            stage.appendChild(messageBar(state.message));

            // Bet config (only when not active)
            if (!state.active) {
                stage.appendChild(el('div', { style: { marginTop: '12px' } }, [
                    el('div', { class: 'chip-label', text: 'Aposta' }),
                    el('div', { class: 'chip-row' }, BET_AMOUNTS.map((v) =>
                        el('button', {
                            class: 'chip' + (state.bet === v ? ' active' : ''),
                            type: 'button',
                            onClick: () => { state.bet = v; paint(); },
                            text: 'R$ ' + v,
                        })
                    )),
                ]));
                stage.appendChild(el('div', { style: { marginTop: '12px' } }, [
                    el('div', { class: 'chip-label', text: 'Bombas' }),
                    el('div', { class: 'chip-row' }, MINES_OPTIONS.map((v) =>
                        el('button', {
                            class: 'chip danger' + (state.mines === v ? ' active' : ''),
                            type: 'button',
                            onClick: () => { state.mines = v; state.board = buildBoard(v); paint(); },
                            text: '💣 ' + v,
                        })
                    )),
                ]));
            }

            // Actions
            const actions = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' } });
            if (!state.active) {
                const canStart = !(state.exploded === false && state.picks === 0 && balance.value < state.bet);
                const restart = state.exploded || state.picks > 0;
                actions.appendChild(el('button', {
                    class: 'btn btn-neon h-12',
                    type: 'button',
                    style: { gridColumn: '1 / span 2' },
                    disabled: !canStart,
                    onClick: restart ? reset : startGame,
                    text: restart ? 'Jogar de novo' : 'Começar — ' + formatBRL(state.bet),
                }));
            } else {
                actions.appendChild(el('button', {
                    class: 'btn btn-outline h-12',
                    type: 'button',
                    onClick: reset,
                    text: 'Desistir',
                }));
                actions.appendChild(el('button', {
                    class: 'btn btn-gold h-12',
                    type: 'button',
                    disabled: state.picks === 0,
                    onClick: cashOut,
                    text: 'Sacar ' + formatBRL(currentPay),
                }));
            }
            stage.appendChild(actions);
        }

        function startGame() {
            if (state.active) return;
            if (balance.value < state.bet) {
                state.message = { text: 'Saldo insuficiente', tone: 'lose' };
                paint();
                return;
            }
            balance.adjust(-state.bet);
            state.board = buildBoard(state.mines);
            state.picks = 0;
            state.exploded = false;
            state.active = true;
            state.message = { text: 'Boa sorte! Revele as gemas.', tone: 'info' };
            paint();
        }
        function revealCell(idx) {
            if (!state.active || state.board[idx].revealed) return;
            const cell = state.board[idx];
            state.board[idx] = { ...cell, revealed: true };
            if (cell.isMine) {
                state.board = state.board.map((c) => ({ ...c, revealed: true }));
                state.exploded = true;
                state.active = false;
                state.message = { text: '💥 Bomba! Perdeu ' + formatBRL(state.bet), tone: 'lose' };
                paint();
                return;
            }
            const newPicks = state.picks + 1;
            state.picks = newPicks;
            const safeCells = GRID_SIZE - state.mines;
            if (newPicks === safeCells) {
                const win = Math.floor(state.bet * multiplierFor(newPicks, state.mines));
                balance.adjust(win);
                state.active = false;
                state.message = { text: 'Limpou o tabuleiro! +' + formatBRL(win), tone: 'win' };
            }
            paint();
        }
        function cashOut() {
            if (!state.active || state.picks === 0) return;
            const mul = multiplierFor(state.picks, state.mines);
            const pay = Math.floor(state.bet * mul);
            balance.adjust(pay);
            state.active = false;
            state.message = { text: 'Sacou ' + formatBRL(pay) + ' (' + mul.toFixed(2) + 'x)', tone: 'win' };
            paint();
        }
        function reset() {
            state.active = false;
            state.exploded = false;
            state.picks = 0;
            state.board = buildBoard(state.mines);
            state.message = { text: 'Pronto para jogar de novo', tone: 'info' };
            paint();
        }

        paint();
    }

    function statBox(label, value, gold) {
        return el('div', { class: 'stat-box' }, [
            el('div', { class: 'label', text: label }),
            el('div', { class: 'value' + (gold ? ' gold' : ''), text: value }),
        ]);
    }
    function messageBar(msg) {
        return el('div', { class: 'message-bar' }, [
            el('span', { class: msg.tone, text: msg.text }),
        ]);
    }

    /* ---- Roleta ---- */
    const WHEEL_ORDER = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
        5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
    ];
    const RED_NUMS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    const SECTOR = 360 / WHEEL_ORDER.length;
    const SECTOR_FILL = {
        red: '#c12c1d',
        black: '#2a1d1f',
        green: '#1f8950',
    };
    function colorOf(n) {
        if (n === 0) return 'green';
        return RED_NUMS.has(n) ? 'red' : 'black';
    }
    function polarToCart(cx, cy, r, deg) {
        const a = ((deg - 90) * Math.PI) / 180;
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    }
    function arcPath(cx, cy, rOuter, rInner, startA, endA) {
        const p1 = polarToCart(cx, cy, rOuter, endA);
        const p2 = polarToCart(cx, cy, rOuter, startA);
        const p3 = polarToCart(cx, cy, rInner, startA);
        const p4 = polarToCart(cx, cy, rInner, endA);
        const large = endA - startA <= 180 ? 0 : 1;
        return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${large} 0 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${large} 1 ${p4.x} ${p4.y} Z`;
    }

    function buildWheelSvg() {
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 200 200');
        svg.classList.add('wheel-svg');

        const defs = document.createElementNS(NS, 'defs');
        defs.innerHTML = '<radialGradient id="wheel-shine" cx="50%" cy="50%" r="50%"><stop offset="60%" stop-color="rgba(255, 255, 255, 0)"/><stop offset="100%" stop-color="rgba(255, 255, 255, 0.12)"/></radialGradient>';
        svg.appendChild(defs);

        const cx = 100, cy = 100, rOuter = 96, rInner = 50, rText = (rOuter + rInner) / 2;

        WHEEL_ORDER.forEach((n, i) => {
            const startA = i * SECTOR - SECTOR / 2;
            const endA = startA + SECTOR;
            const midA = i * SECTOR;
            const c = colorOf(n);
            const path = document.createElementNS(NS, 'path');
            path.setAttribute('d', arcPath(cx, cy, rOuter, rInner, startA, endA));
            path.setAttribute('fill', SECTOR_FILL[c]);
            path.setAttribute('stroke', 'rgba(217, 179, 66, 0.4)');
            path.setAttribute('stroke-width', '0.5');
            svg.appendChild(path);

            const tp = polarToCart(cx, cy, rText, midA);
            const txt = document.createElementNS(NS, 'text');
            txt.setAttribute('x', tp.x);
            txt.setAttribute('y', tp.y);
            txt.setAttribute('fill', 'white');
            txt.setAttribute('font-size', '9');
            txt.setAttribute('font-weight', '800');
            txt.setAttribute('text-anchor', 'middle');
            txt.setAttribute('dominant-baseline', 'central');
            txt.setAttribute('font-family', 'Rajdhani, sans-serif');
            txt.setAttribute('transform', `rotate(${midA}, ${tp.x}, ${tp.y})`);
            txt.textContent = String(n);
            svg.appendChild(txt);
        });

        const shine = document.createElementNS(NS, 'circle');
        shine.setAttribute('cx', cx);
        shine.setAttribute('cy', cy);
        shine.setAttribute('r', rOuter);
        shine.setAttribute('fill', 'url(#wheel-shine)');
        svg.appendChild(shine);

        const hubOuter = document.createElementNS(NS, 'circle');
        hubOuter.setAttribute('cx', cx);
        hubOuter.setAttribute('cy', cy);
        hubOuter.setAttribute('r', rInner);
        hubOuter.setAttribute('fill', '#322518');
        hubOuter.setAttribute('stroke', 'rgba(217, 179, 66, 0.6)');
        hubOuter.setAttribute('stroke-width', '1.5');
        svg.appendChild(hubOuter);

        const hubInner = document.createElementNS(NS, 'circle');
        hubInner.setAttribute('cx', cx);
        hubInner.setAttribute('cy', cy);
        hubInner.setAttribute('r', rInner - 6);
        hubInner.setAttribute('fill', '#1c1610');
        svg.appendChild(hubInner);

        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('cx', cx);
        dot.setAttribute('cy', cy);
        dot.setAttribute('r', 4);
        dot.setAttribute('fill', '#d9b342');
        svg.appendChild(dot);

        return svg;
    }

    function renderRoleta(root) {
        const BET_AMOUNTS = [10, 25, 50, 100];
        const SPIN_DURATION_S = 4;

        const state = {
            amount: 25,
            bet: null,
            spinning: false,
            result: null,
            angle: 0,
            message: { text: 'Escolha uma aposta e gire', tone: 'info' },
        };

        let timer = null;

        function payoutMultiplier(b, result) {
            if (result === 0) return b.kind === 'number' && b.value === 0 ? 35 : 0;
            switch (b.kind) {
                case 'color': return colorOf(result) === b.value ? 2 : 0;
                case 'parity': return result % 2 === (b.value === 'even' ? 0 : 1) ? 2 : 0;
                case 'range': return (b.value === 'low' ? result <= 18 : result >= 19) ? 2 : 0;
                case 'number': return result === b.value ? 36 : 0;
            }
            return 0;
        }
        function isSelected(b) {
            return state.bet && state.bet.kind === b.kind && state.bet.value === b.value;
        }
        function chooseBet(b) {
            if (state.spinning) return;
            state.bet = b;
            paintControls();
        }

        root.appendChild(gameHeader('Roleta', '🎡'));

        const stage = el('div', { style: { padding: '0 12px 12px' } });
        root.appendChild(stage);

        // Persistent wheel — built once so transform animations actually run
        const wheelSvg = buildWheelSvg();
        const badge = el('div', { class: 'badge' });
        const centerBadge = el('div', { class: 'wheel-center' }, [badge]);
        const wheelStage = el('div', { class: 'wheel-stage' }, [
            el('div', { class: 'wheel-pointer' }),
            el('div', { class: 'wheel-outer' }),
            wheelSvg,
            centerBadge,
        ]);
        const wheelWrap = el('div', { class: 'wheel-wrap glow-radial' }, [wheelStage]);
        stage.appendChild(wheelWrap);

        const messageNode = el('div', { class: 'message-bar' });
        stage.appendChild(messageNode);

        const controlsNode = el('div');
        stage.appendChild(controlsNode);

        function paintBadge() {
            badge.innerHTML = '';
            if (state.result !== null && !state.spinning) {
                const c = colorOf(state.result);
                badge.appendChild(el('span', { class: 'num ' + c, text: String(state.result) }));
                badge.appendChild(el('span', { class: 'lbl', text: c }));
            } else {
                badge.appendChild(el('span', { style: { fontSize: '24px' }, text: '🎡' }));
            }
        }

        function paintMessage() {
            messageNode.innerHTML = '';
            messageNode.appendChild(el('span', { class: state.message.tone, text: state.message.text }));
        }

        function paintControls() {
            controlsNode.innerHTML = '';

            // Bet amount
            controlsNode.appendChild(el('div', { style: { marginTop: '12px' } }, [
                el('div', { class: 'chip-label', text: 'Aposta' }),
                el('div', { class: 'chip-row' }, BET_AMOUNTS.map((v) =>
                    el('button', {
                        class: 'chip' + (state.amount === v ? ' active' : ''),
                        type: 'button',
                        disabled: state.spinning,
                        onClick: () => { state.amount = v; paintControls(); },
                        text: 'R$ ' + v,
                    })
                )),
            ]));

            // Even-money bets
            const evenMoney = [
                { kind: 'color', value: 'red', label: 'Vermelho', cls: 'red' },
                { kind: 'color', value: 'black', label: 'Preto', cls: 'black' },
                { kind: 'parity', value: 'even', label: 'Par', cls: '' },
                { kind: 'parity', value: 'odd', label: 'Ímpar', cls: '' },
                { kind: 'range', value: 'low', label: '1–18', cls: '' },
                { kind: 'range', value: 'high', label: '19–36', cls: '' },
            ];
            controlsNode.appendChild(el('div', { style: { marginTop: '12px' } }, [
                el('div', { class: 'chip-label', text: 'Tipo de aposta (paga 2x)' }),
                el('div', { class: 'bet-grid-2' }, evenMoney.map((b) =>
                    el('button', {
                        class: 'bet-btn ' + b.cls + (isSelected(b) ? ' selected' : ''),
                        type: 'button',
                        disabled: state.spinning,
                        onClick: () => chooseBet({ kind: b.kind, value: b.value }),
                        text: b.label,
                    })
                )),
            ]));

            // Number grid
            controlsNode.appendChild(el('div', { style: { marginTop: '12px' } }, [
                el('div', { class: 'chip-label', text: 'Número direto (paga 36x)' }),
                el('div', { class: 'numbers-grid' }, [
                    el('button', {
                        class: 'zero' + (isSelected({ kind: 'number', value: 0 }) ? ' selected' : ''),
                        type: 'button',
                        disabled: state.spinning,
                        onClick: () => chooseBet({ kind: 'number', value: 0 }),
                        text: '0',
                    }),
                    Array.from({ length: 36 }, (_, i) => i + 1).map((n) => {
                        const c = colorOf(n);
                        const sel = isSelected({ kind: 'number', value: n });
                        return el('button', {
                            class: 'num-btn' + (c === 'red' ? ' red' : '') + (sel ? ' selected' : ''),
                            type: 'button',
                            disabled: state.spinning,
                            onClick: () => chooseBet({ kind: 'number', value: n }),
                            text: String(n),
                        });
                    }),
                ]),
            ]));

            // Spin button
            controlsNode.appendChild(el('button', {
                class: 'btn btn-neon h-12',
                style: { marginTop: '12px' },
                type: 'button',
                disabled: state.spinning || !state.bet || balance.value < state.amount,
                onClick: spin,
                text: state.spinning ? 'Girando...' : 'Girar — ' + formatBRL(state.amount),
            }));
        }

        function spin() {
            if (state.spinning) return;
            if (!state.bet) {
                state.message = { text: 'Escolha uma aposta primeiro', tone: 'info' };
                paintMessage();
                return;
            }
            if (balance.value < state.amount) {
                state.message = { text: 'Saldo insuficiente', tone: 'lose' };
                paintMessage();
                return;
            }
            balance.adjust(-state.amount);
            state.spinning = true;
            state.result = null;
            state.message = { text: 'Girando...', tone: 'info' };

            const winning = Math.floor(Math.random() * 37);
            const winningIndex = WHEEL_ORDER.indexOf(winning);
            const turns = 6;
            const offset = 360 - winningIndex * SECTOR;
            const jitter = (Math.random() - 0.5) * (SECTOR * 0.6);
            const base = Math.ceil(state.angle / 360) * 360;
            state.angle = base + turns * 360 + offset + jitter;

            // Apply rotation directly on the persistent SVG so the CSS
            // transition can interpolate from the previous angle.
            wheelSvg.style.transition = `transform ${SPIN_DURATION_S}s cubic-bezier(0.15, 0.7, 0.2, 1)`;
            wheelSvg.style.transform = `rotate(${state.angle}deg)`;

            paintBadge();
            paintMessage();
            paintControls();

            timer = setTimeout(() => {
                state.result = winning;
                const mul = payoutMultiplier(state.bet, winning);
                const win = state.amount * mul;
                if (win > 0) {
                    balance.adjust(win);
                    state.message = {
                        text: winning + ' ' + colorOf(winning).toUpperCase() + ' — ganhou ' + formatBRL(win),
                        tone: 'win',
                    };
                } else {
                    state.message = {
                        text: winning + ' ' + colorOf(winning).toUpperCase() + ' — sem prêmio',
                        tone: 'lose',
                    };
                }
                state.spinning = false;
                paintBadge();
                paintMessage();
                paintControls();
            }, SPIN_DURATION_S * 1000 + 100);
        }

        // Initial paint
        wheelSvg.style.transform = `rotate(${state.angle}deg)`;
        paintBadge();
        paintMessage();
        paintControls();

        // Cleanup when leaving the route
        const off = () => { if (timer) clearTimeout(timer); window.removeEventListener('hashchange', off); };
        window.addEventListener('hashchange', off);
    }

    /* ---- Slots ---- */
    function renderSlots(root) {
        const SYMBOLS = [
            { id: 'cherry', emoji: '🍒', weight: 30, payout: 3 },
            { id: 'lemon', emoji: '🍋', weight: 25, payout: 4 },
            { id: 'bell', emoji: '🔔', weight: 18, payout: 6 },
            { id: 'star', emoji: '⭐', weight: 12, payout: 10 },
            { id: 'gem', emoji: '💎', weight: 8, payout: 20 },
            { id: 'g', emoji: 'G', weight: 4, payout: 50, image: 'assets/slots-g-symbol.png' },
        ];
        const TOTAL = SYMBOLS.reduce((s, x) => s + x.weight, 0);
        const BET_OPTIONS = [10, 25, 50, 100];

        function pickSymbol() {
            let r = Math.random() * TOTAL;
            for (const s of SYMBOLS) { r -= s.weight; if (r <= 0) return s; }
            return SYMBOLS[0];
        }

        const state = {
            bet: 25,
            reels: [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]],
            spinning: [false, false, false],
            message: { text: 'Aposte e gire para começar', tone: 'info' },
            lastWin: 0,
        };
        const timers = [];

        root.appendChild(gameHeader('Slots', '🎰'));

        const stage = el('div', { style: { padding: '0 12px 12px' } });
        root.appendChild(stage);

        function symGlyph(s) {
            if (s.image) return el('img', { src: s.image, alt: 'G', width: 40, height: 40 });
            return el('span', { text: s.emoji });
        }

        function paint() {
            stage.innerHTML = '';
            const isSpinning = state.spinning.some(Boolean);

            // Machine
            const reelsEl = el('div', { class: 'reels' }, state.reels.map((sym, i) => {
                const reel = el('div', { class: 'reel' + (state.spinning[i] ? ' spinning' : '') });
                if (state.spinning[i]) {
                    const stack = el('div', { class: 'symbol-stack' });
                    SYMBOLS.concat(SYMBOLS).forEach((s) => {
                        stack.appendChild(el('span', { class: 'symbol' }, symGlyph(s)));
                    });
                    reel.appendChild(stack);
                } else {
                    reel.appendChild(el('span', { class: 'symbol' }, symGlyph(sym)));
                }
                return reel;
            }));
            const machine = el('div', { class: 'slots-machine glow-radial' }, [
                el('div', {}, [
                    reelsEl,
                    state.lastWin > 0 ? el('div', { class: 'win-banner' }, [
                        el('span', { text: '+ ' + formatBRL(state.lastWin) }),
                    ]) : null,
                ]),
            ]);
            stage.appendChild(machine);

            stage.appendChild(messageBar(state.message));

            // Bet
            stage.appendChild(el('div', { style: { marginTop: '12px' } }, [
                el('div', { class: 'chip-label', text: 'Aposta' }),
                el('div', { class: 'chip-row' }, BET_OPTIONS.map((v) =>
                    el('button', {
                        class: 'chip' + (state.bet === v ? ' active' : ''),
                        type: 'button',
                        disabled: isSpinning,
                        onClick: () => { state.bet = v; paint(); },
                        text: 'R$ ' + v,
                    })
                )),
            ]));

            // Spin button
            stage.appendChild(el('button', {
                class: 'btn btn-neon h-12',
                style: { marginTop: '12px' },
                type: 'button',
                disabled: isSpinning || balance.value < state.bet,
                onClick: spin,
                text: isSpinning ? 'Girando...' : 'Girar — ' + formatBRL(state.bet),
            }));

            // Paytable
            stage.appendChild(el('div', { class: 'paytable' }, [
                el('h3', { text: 'Tabela de prêmios (3 iguais)' }),
                el('div', { class: 'grid' }, SYMBOLS.map((s) =>
                    el('div', { class: 'row' }, [
                        el('span', { class: 'sym' }, symGlyph(s)),
                        el('span', { class: 'pay', text: s.payout + 'x' }),
                    ])
                )),
                el('p', { class: 'note', text: '2 iguais pagam 1.5x da aposta' }),
            ]));
        }

        function spin() {
            if (state.spinning.some(Boolean)) return;
            if (balance.value < state.bet) {
                state.message = { text: 'Saldo insuficiente', tone: 'lose' };
                paint();
                return;
            }
            balance.adjust(-state.bet);
            state.lastWin = 0;
            state.message = { text: '...', tone: 'info' };
            const final = [pickSymbol(), pickSymbol(), pickSymbol()];
            state.spinning = [true, true, true];
            paint();

            [800, 1300, 1800].forEach((delay, idx) => {
                const t = setTimeout(() => {
                    state.reels[idx] = final[idx];
                    state.spinning[idx] = false;
                    if (idx === 2) {
                        const [a, b, c] = final;
                        let win = 0;
                        if (a.id === b.id && b.id === c.id) {
                            win = state.bet * a.payout;
                            state.message = { text: 'JACKPOT! 3x ' + a.emoji + ' — ganhou ' + formatBRL(win), tone: 'win' };
                        } else if (a.id === b.id || b.id === c.id || a.id === c.id) {
                            win = Math.floor(state.bet * 1.5);
                            state.message = { text: '2 iguais — ganhou ' + formatBRL(win), tone: 'win' };
                        } else {
                            state.message = { text: 'Sem prêmio. Tente de novo!', tone: 'lose' };
                        }
                        if (win > 0) {
                            balance.adjust(win);
                            state.lastWin = win;
                        }
                    }
                    paint();
                }, delay);
                timers.push(t);
            });
        }

        paint();

        const off = () => { timers.forEach(clearTimeout); window.removeEventListener('hashchange', off); };
        window.addEventListener('hashchange', off);
    }

    /* ---- Carteira ---- */
    function renderCarteira(root) {
        const QUICK = [50, 100, 200, 500];
        const MIN_DEP = 10, MAX_DEP = 10000;
        const MIN_WIT = 20, MAX_WIT = 10000;

        const state = { tab: 'deposit', amount: '', error: null };

        const wrap = el('section', { class: 'section' });
        root.appendChild(wrap);

        function showToast(t) {
            const layer = $('#toast-wrap');
            layer.innerHTML = '';
            const node = el('div', { class: 'toast ' + t.tone }, [el('p', { text: t.text })]);
            layer.appendChild(node);
            setTimeout(() => { if (node.parentNode) node.parentNode.removeChild(node); }, 3500);
        }

        function paint() {
            wrap.innerHTML = '';

            // Title
            wrap.appendChild(el('div', {}, [
                el('h1', { class: 'section-heading', style: { fontSize: '15px' }, text: 'Carteira' }),
                el('div', { class: 'section-sub', text: 'Gerencie seu saldo' }),
            ]));

            // Saldo
            wrap.appendChild(el('div', { class: 'wallet-balance glow-radial' }, [
                el('div', { class: 'glow-blob tr' }),
                el('div', { class: 'lbl', text: 'Saldo disponível' }),
                el('div', { class: 'amt', text: formatBRL(balance.value) }),
                el('div', { class: 'verified' }, [el('span', { text: '💎' }), 'Conta verificada']),
            ]));

            // Banner bônus
            if (!balance.firstDepositDone) {
                wrap.appendChild(el('div', { class: 'bonus-banner' }, [
                    el('div', { class: 'glow-bg', text: '🎁' }),
                    el('div', { class: 'row' }, [
                        el('span', { class: 'icon', text: '🎁' }),
                        el('div', { style: { flex: '1' } }, [
                            el('div', { class: 'lbl', text: 'Bônus de boas-vindas' }),
                            el('h3', { text: '+' + WELCOME_BONUS_PERCENT + '% no 1º depósito' }),
                            el('p', {}, [
                                'Ganhe até ',
                                el('span', { class: 'gold', text: formatBRL(WELCOME_BONUS_MAX) }),
                                ' extras. Depositando ',
                                formatBRL(200),
                                ' você joga com ',
                                el('span', { class: 'gold', text: formatBRL(200 + Math.min(200 * 5, WELCOME_BONUS_MAX)) }),
                                '.',
                            ]),
                        ]),
                    ]),
                ]));
            }

            // Tabs
            wrap.appendChild(el('div', { class: 'tabs' }, ['deposit', 'withdraw'].map((t) =>
                el('button', {
                    class: 'tab-btn' + (state.tab === t ? ' active' : ''),
                    type: 'button',
                    onClick: () => { state.tab = t; state.amount = ''; state.error = null; paint(); },
                    text: t === 'deposit' ? 'Depositar' : 'Sacar',
                })
            )));

            // Form
            const num = parseAmount(state.amount);
            const previewBonus = (state.tab === 'deposit' && !balance.firstDepositDone && Number.isFinite(num) && num > 0)
                ? Math.min(Math.floor((num * WELCOME_BONUS_PERCENT) / 100), WELCOME_BONUS_MAX)
                : 0;

            const form = el('div', { style: { marginTop: '12px' } });

            form.appendChild(el('label', { class: 'field-label', for: 'amount', text: 'Valor' }));
            const inputWrap = el('div', { class: 'amount-input' }, [
                el('span', { class: 'currency', text: 'R$' }),
            ]);
            const input = el('input', {
                id: 'amount',
                type: 'text',
                inputmode: 'numeric',
                placeholder: '0',
                value: state.amount,
            });
            input.addEventListener('input', (e) => {
                state.amount = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
                state.error = null;
                e.target.value = state.amount;
                refreshBonus();
                refreshSubmit();
            });
            inputWrap.appendChild(input);
            form.appendChild(inputWrap);

            // Quick amounts
            const quick = el('div', { class: 'chip-row', style: { marginTop: '8px' } }, QUICK.map((v) =>
                el('button', {
                    class: 'chip' + (num === v ? ' active' : ''),
                    type: 'button',
                    onClick: () => { state.amount = String(v); state.error = null; paint(); },
                    text: 'R$ ' + v,
                })
            ));
            form.appendChild(quick);

            // Bonus preview holder
            const bonusHolder = el('div');
            form.appendChild(bonusHolder);
            function refreshBonus() {
                bonusHolder.innerHTML = '';
                const n = parseAmount(state.amount);
                if (state.tab !== 'deposit' || balance.firstDepositDone || !Number.isFinite(n) || n <= 0) return;
                const pb = Math.min(Math.floor((n * WELCOME_BONUS_PERCENT) / 100), WELCOME_BONUS_MAX);
                if (pb <= 0) return;
                bonusHolder.appendChild(el('div', { class: 'preview-bonus' }, [
                    el('div', { class: 'row' }, [
                        el('span', { class: 'lbl', text: 'Bônus 500%' }),
                        el('span', { class: 'gold', text: '+ ' + formatBRL(pb) }),
                    ]),
                    el('div', { class: 'row' }, [
                        el('span', { class: 'total-lbl', text: 'Total creditado' }),
                        el('span', { class: 'total', text: formatBRL(n + pb) }),
                    ]),
                ]));
            }
            refreshBonus();

            // Error
            const errorHolder = el('div');
            form.appendChild(errorHolder);
            function refreshError() {
                errorHolder.innerHTML = '';
                if (state.error) errorHolder.appendChild(el('p', { class: 'error-text', text: state.error }));
            }
            refreshError();

            // Submit
            const submitBtn = el('button', {
                class: 'btn ' + (state.tab === 'deposit' ? 'btn-neon' : 'btn-gold') + ' h-12',
                style: { marginTop: '12px' },
                type: 'button',
                onClick: handleSubmit,
            });
            form.appendChild(submitBtn);

            function refreshSubmit() {
                const n = parseAmount(state.amount);
                const has = state.amount.length > 0;
                submitBtn.disabled = !has;
                const lbl = formatBRL(Number.isFinite(n) ? n : 0);
                submitBtn.textContent = state.tab === 'deposit'
                    ? 'Depositar' + (has ? ' ' + lbl : '')
                    : 'Sacar' + (has ? ' ' + lbl : '');
            }
            refreshSubmit();

            form.appendChild(el('p', {
                class: 'note',
                text: state.tab === 'deposit'
                    ? 'Mín. ' + formatBRL(MIN_DEP) + ' · Máx. ' + formatBRL(MAX_DEP)
                    : 'Mín. ' + formatBRL(MIN_WIT) + ' · Máx. ' + formatBRL(MAX_WIT),
            }));

            // Done banner
            if (balance.firstDepositDone) {
                form.appendChild(el('div', {
                    style: {
                        marginTop: '16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'rgba(29, 21, 49, 0.4)',
                        padding: '8px 12px',
                        textAlign: 'center',
                        fontSize: '9px',
                        letterSpacing: '0.1em',
                        color: 'var(--muted-foreground)',
                        textTransform: 'uppercase',
                    },
                    text: '✓ Bônus de boas-vindas já utilizado',
                }));
            }

            wrap.appendChild(form);

            function parseAmount(s) {
                const n = Number(String(s).replace(',', '.'));
                return Number.isFinite(n) ? Math.floor(n) : NaN;
            }

            function handleSubmit() {
                state.error = null;
                const n = parseAmount(state.amount);
                if (!Number.isFinite(n)) { state.error = 'Informe um valor válido'; refreshError(); return; }
                if (state.tab === 'deposit') {
                    if (n < MIN_DEP) { state.error = 'Depósito mínimo: ' + formatBRL(MIN_DEP); refreshError(); return; }
                    if (n > MAX_DEP) { state.error = 'Depósito máximo: ' + formatBRL(MAX_DEP); refreshError(); return; }
                    const r = balance.deposit(n);
                    showToast({ tone: 'success', text: r.applied
                        ? 'Depósito de ' + formatBRL(n) + ' + bônus ' + formatBRL(r.bonus) + ' creditados!'
                        : 'Depósito de ' + formatBRL(n) + ' creditado!' });
                    state.amount = '';
                    paint();
                } else {
                    if (n < MIN_WIT) { state.error = 'Saque mínimo: ' + formatBRL(MIN_WIT); refreshError(); return; }
                    if (n > MAX_WIT) { state.error = 'Saque máximo: ' + formatBRL(MAX_WIT); refreshError(); return; }
                    if (n > balance.value) { state.error = 'Saldo insuficiente'; refreshError(); return; }
                    const ok = balance.withdraw(n);
                    if (ok) {
                        showToast({ tone: 'success', text: 'Saque de ' + formatBRL(n) + ' processado!' });
                        state.amount = '';
                        paint();
                    } else {
                        state.error = 'Não foi possível processar o saque';
                        refreshError();
                    }
                }
            }
        }

        function parseAmount(s) {
            const n = Number(String(s).replace(',', '.'));
            return Number.isFinite(n) ? Math.floor(n) : NaN;
        }

        paint();
    }

    /* ---- Perfil ---- */
    function renderPerfil(root) {
        const GAME_META = {
            slots: { label: 'Slots', emoji: '🎰' },
            roleta: { label: 'Roleta', emoji: '🎡' },
            mines: { label: 'Mines', emoji: '💣' },
        };
        const HISTORY = [
            { id: 'h1', game: 'slots', bet: 50, payout: 2500, detail: 'JACKPOT 3x 7️⃣', agoMinutes: 4 },
            { id: 'h2', game: 'mines', bet: 100, payout: 0, detail: 'Bomba na 4ª escolha', agoMinutes: 18 },
            { id: 'h3', game: 'roleta', bet: 25, payout: 900, detail: 'Número 17 cheio', agoMinutes: 32 },
            { id: 'h4', game: 'slots', bet: 25, payout: 0, detail: 'Sem combinação', agoMinutes: 47 },
            { id: 'h5', game: 'mines', bet: 50, payout: 235, detail: 'Saque em 4.7x', agoMinutes: 65 },
            { id: 'h6', game: 'roleta', bet: 100, payout: 0, detail: 'Apostou Vermelho · saiu Preto', agoMinutes: 88 },
            { id: 'h7', game: 'slots', bet: 100, payout: 600, detail: '3x 💎 — pagou 6x', agoMinutes: 110 },
            { id: 'h8', game: 'roleta', bet: 50, payout: 100, detail: 'Ímpar acertou', agoMinutes: 142 },
            { id: 'h9', game: 'mines', bet: 25, payout: 0, detail: 'Bomba na 2ª escolha', agoMinutes: 168 },
            { id: 'h10', game: 'slots', bet: 10, payout: 0, detail: 'Sem combinação', agoMinutes: 195 },
            { id: 'h11', game: 'mines', bet: 200, payout: 1340, detail: 'Saque em 6.7x', agoMinutes: 230 },
            { id: 'h12', game: 'roleta', bet: 25, payout: 0, detail: 'Apostou Par · saiu 0', agoMinutes: 280 },
        ];
        const wins = HISTORY.filter((e) => e.payout > 0);
        const totalEarnings = wins.reduce((s, e) => s + e.payout, 0);

        function ago(min) {
            if (min < 60) return 'há ' + min + ' min';
            const h = Math.floor(min / 60);
            if (h < 24) return 'há ' + h + 'h';
            const d = Math.floor(h / 24);
            return 'há ' + d + 'd';
        }

        const wrap = el('section', { class: 'section' });

        // Profile head
        wrap.appendChild(el('div', { class: 'profile-head' }, [
            el('div', { class: 'profile-avatar', text: 'CD' }, [
                el('div', { class: 'badge' }),
            ]),
            el('div', { style: { flex: '1' } }, [
                el('div', { class: 'profile-name', text: 'Jogador CDBets' }),
                el('div', { class: 'profile-meta', text: 'Membro desde abr/2026' }),
            ]),
        ]));

        // Earnings
        wrap.appendChild(el('div', { class: 'earnings-card' }, [
            el('div', { class: 'glow-blob gold-tr' }),
            el('div', { class: 'lbl', text: '💰 Total ganho em vitórias' }),
            el('div', { class: 'amt', text: formatBRL(totalEarnings) }),
            el('p', { text: 'Soma de todos os prêmios recebidos (' + wins.length + ' vitórias)' }),
        ]));

        // Mini stats
        wrap.appendChild(el('div', { style: { marginTop: '12px' } }, [
            el('div', { class: 'stat-box' }, [
                el('div', { class: 'label', text: 'Partidas jogadas' }),
                el('div', { class: 'value', style: { fontSize: '16px' }, text: String(HISTORY.length) }),
            ]),
        ]));

        // History header
        wrap.appendChild(el('div', { style: { marginTop: '20px' }, class: 'row-between' }, [
            el('div', {}, [
                el('h2', { class: 'section-heading', text: 'Histórico' }),
                el('div', { class: 'section-sub', text: 'Vitórias em destaque' }),
            ]),
        ]));

        // History list
        const list = el('div', { class: 'history' });
        HISTORY.forEach((e) => {
            const meta = GAME_META[e.game];
            if (e.payout > 0) {
                const profit = e.payout - e.bet;
                list.appendChild(el('div', { class: 'history-win' }, [
                    el('div', { class: 'glow-blob gold-tr' }),
                    el('div', { class: 'row' }, [
                        el('div', { class: 'icon-box', text: meta.emoji }),
                        el('div', { style: { flex: '1', minWidth: '0' } }, [
                            el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, [
                                el('span', { class: 'game-label', text: meta.label }),
                                el('span', { class: 'badge-win', text: 'Vitória' }),
                            ]),
                            el('div', { class: 'detail', text: e.detail }),
                            el('div', { class: 'meta', text: 'Aposta ' + formatBRL(e.bet) + ' · ' + ago(e.agoMinutes) }),
                        ]),
                        el('div', { class: 'right' }, [
                            el('div', { class: 'amt', text: '+' + formatBRL(e.payout) }),
                            el('div', { class: 'profit', text: 'lucro ' + formatBRL(profit) }),
                        ]),
                    ]),
                ]));
            } else {
                list.appendChild(el('div', { class: 'history-loss' }, [
                    el('span', { class: 'emoji', text: meta.emoji }),
                    el('div', { class: 'info' }, [
                        el('div', {}, [
                            el('span', { class: 'game', text: meta.label }),
                            ' ',
                            el('span', { class: 'ago', text: '· ' + ago(e.agoMinutes) }),
                        ]),
                        el('div', { class: 'detail', text: e.detail }),
                    ]),
                    el('div', { class: 'amt', text: '−' + formatBRL(e.bet) }),
                ]));
            }
        });
        wrap.appendChild(list);

        root.appendChild(wrap);
    }

    /* =========================================================
     *  LB Phone integration (settings, components)
     * ========================================================= */
    if (typeof onSettingsChange === 'function') {
        onSettingsChange((settings) => {
            // The casino theme is intentionally always dark — we ignore the
            // user's theme setting on purpose to keep the brand identity.
            const app = $('.app');
            if (app) app.dataset.theme = 'dark';
        });
    }
    if (typeof getSettings === 'function') {
        getSettings().then(() => {
            const app = $('.app');
            if (app) app.dataset.theme = 'dark';
        });
    }

    // Make sure the app is visible (the template hides body to prevent FOUC)
    document.body.style.visibility = 'visible';

    // Boot
    renderRoute();
})();
