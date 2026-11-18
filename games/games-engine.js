/**
 * ============================================================================
 * 🎮 BONDAGE CLUB ARCADE & LOCK RECOVERY PORTAL — CORE ENGINE (games-engine.js)
 * ============================================================================
 * Architettura modulare "Plug & Play" per minigiochi a tema Bondage Club,
 * supporto multi-lucchetto per stesso Player ID, Pannello Admin protetto
 * e sincronizzazione automatica su GitHub Pages.
 * ============================================================================
 */

(function () {
	"use strict";

	// Hash SHA-256 della Master Password Admin
	const DEFAULT_ADMIN_HASH = "b47da9cfa588ae5a94844c0c5fa58ec1fc7929c16b606715e4be8f4ecd68af35";

	// Token GitHub cifrato con chiave derivata dalla Master Password Admin
	const ENCRYPTED_GH_TOKEN_HEX =
		"5b8e5d9f355e79cc714b4c1754297fbfbc051cd8c8bd8d9c4f68f4e415b57e9657b862af106640de6955674a372c4abc9a2276cda0bebda04843c0d04e8b6df37dbd509c2f0e6b8b62787072523d08a6b4077bd9ca918abe3040e8d532";

	// Chiave simmetrica interna per offuscare i link ?c=...
	const CIPHER_SECRET = "BCArcade_LockRecovery_2026_SecretKey!#99";

	const STORAGE_KEYS = {
		CONFIG: "BCArcade_Config_v1",
		VAULT: "BCArcade_PasswordVault_v1",
		LOGS: "BCArcade_DiagnosticLogs_v1",
		ADMIN_SESSION: "BCArcade_AdminUnlocked_v1",
		GH_TOKEN: "BCArcade_GitHubToken_v1",
		SOLVED_LOCKS: "BCArcade_SolvedSession_v1"
	};

	/* =========================================================================
	 * 1. SISTEMA DI LOGGING & TELEMETRIA DIAGNOSTICA (BC_GAMES_LOGGER)
	 * ========================================================================= */
	const BC_GAMES_LOGGER = {
		maxEntries: 400,
		entries: [],
		syncTimer: null,

		init() {
			try {
				const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
				if (saved) {
					const parsed = JSON.parse(saved);
					if (Array.isArray(parsed)) this.entries = parsed.slice(-this.maxEntries);
				}
			} catch (_) {}
			this.log("SYSTEM", "BC Arcade Engine v1.2 initialized", {
				url: window.location.href
			});
		},

		log(category, message, data = null) {
			const entry = {
				ts: new Date().toISOString(),
				cat: String(category || "INFO").toUpperCase(),
				msg: String(message || ""),
				data: data !== undefined && data !== null ? data : undefined
			};
			this.entries.push(entry);
			if (this.entries.length > this.maxEntries) {
				this.entries = this.entries.slice(-this.maxEntries);
			}
			try {
				localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(this.entries));
			} catch (_) {}

			const prefix = `[BC-Arcade][${entry.cat}]`;
			if (entry.cat === "ERROR") {
				console.error(prefix, entry.msg, entry.data || "");
			} else if (entry.cat === "WARN") {
				console.warn(prefix, entry.msg, entry.data || "");
			} else {
				console.log(prefix, entry.msg, entry.data || "");
			}

			if (typeof this.onUpdate === "function") {
				this.onUpdate();
			}

			this.scheduleCloudLogSync();
			return entry;
		},

		scheduleCloudLogSync() {
			if (this.syncTimer) clearTimeout(this.syncTimer);
			this.syncTimer = setTimeout(() => {
				if (window.BC_APP_CONTROLLER && typeof window.BC_APP_CONTROLLER.pushLogsToGitHub === "function") {
					window.BC_APP_CONTROLLER.pushLogsToGitHub(true);
				}
			}, 4000);
		},

		formatAsText() {
			const header = [
				"=== BONDAGE CLUB ARCADE & LOCK RECOVERY — DIAGNOSTIC LOG ===",
				`Exported At: ${new Date().toISOString()}`,
				`Total Entries: ${this.entries.length}`,
				"============================================================"
			].join("\n");

			const lines = this.entries.map((e, i) => {
				const dataStr = e.data !== undefined ? ` | DATA: ${JSON.stringify(e.data)}` : "";
				return `${String(i + 1).padStart(3, "0")}. [${e.ts}] [${e.cat}] ${e.msg}${dataStr}`;
			});
			return header + "\n" + lines.join("\n");
		},

		clear() {
			this.entries = [];
			try {
				localStorage.removeItem(STORAGE_KEYS.LOGS);
			} catch (_) {}
			this.log("SYSTEM", "Diagnostic logs cleared.");
		}
	};

	window.BCArcadeDumpLog = function () {
		const txt = BC_GAMES_LOGGER.formatAsText();
		console.log(txt);
		return txt;
	};

	/* =========================================================================
	 * 2. SINTETIZZATORE AUDIO WEBAUDIO (BC_SOUND_FX)
	 * ========================================================================= */
	const BC_SOUND_FX = {
		ctx: null,
		muted: false,

		_getContext() {
			if (this.muted) return null;
			if (!this.ctx) {
				const AudioCtx = window.AudioContext || window.webkitAudioContext;
				if (AudioCtx) this.ctx = new AudioCtx();
			}
			if (this.ctx && this.ctx.state === "suspended") {
				this.ctx.resume().catch(() => {});
			}
			return this.ctx;
		},

		playTone(freq, type = "sine", duration = 0.08, gainVal = 0.12, delay = 0) {
			const ctx = this._getContext();
			if (!ctx) return;
			try {
				const now = ctx.currentTime + delay;
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = type;
				osc.frequency.setValueAtTime(freq, now);
				gain.gain.setValueAtTime(gainVal, now);
				gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(now);
				osc.stop(now + duration);
			} catch (_) {}
		},

		click() {
			this.playTone(920, "triangle", 0.04, 0.12);
		},

		tumblerMatch() {
			this.playTone(580, "sine", 0.07, 0.15, 0);
			this.playTone(880, "triangle", 0.09, 0.15, 0.06);
		},

		strapLoosen() {
			this.playTone(320, "triangle", 0.08, 0.18, 0);
			this.playTone(520, "sine", 0.11, 0.16, 0.05);
		},

		errorBuzz() {
			this.playTone(150, "sawtooth", 0.14, 0.14, 0);
			this.playTone(115, "sawtooth", 0.16, 0.14, 0.08);
		},

		vibePulse(intensity = 1) {
			const freq = 75 + intensity * 22;
			this.playTone(freq, "sawtooth", 0.18, 0.07 + intensity * 0.02, 0);
		},

		unlockSuccess() {
			this.playTone(523.25, "triangle", 0.12, 0.18, 0);
			this.playTone(659.25, "triangle", 0.12, 0.18, 0.10);
			this.playTone(783.99, "triangle", 0.14, 0.18, 0.20);
			this.playTone(1046.5, "sine", 0.28, 0.22, 0.30);
		}
	};

	/* =========================================================================
	 * 3. CRITTOGRAFIA TICKET, URL PAYLOAD & TOKEN ADMIN (BC_CRYPTO_CODEC)
	 * ========================================================================= */
	const BC_CRYPTO_CODEC = {
		async sha256Hex(text) {
			const str = String(text || "");
			if (window.crypto && window.crypto.subtle) {
				try {
					const buf = new TextEncoder().encode(str);
					const hashBuf = await window.crypto.subtle.digest("SHA-256", buf);
					return Array.from(new Uint8Array(hashBuf))
						.map((b) => b.toString(16).padStart(2, "0"))
						.join("");
				} catch (_) {}
			}
			return this._fallbackSha256(str);
		},

		async unlockGitHubTokenWithPassword(adminPassword) {
			try {
				const keyHex = await this.sha256Hex("JOJO_GH_VAULT::" + String(adminPassword || "").trim());
				const keyBytes = [];
				for (let i = 0; i < keyHex.length; i += 2) {
					keyBytes.push(parseInt(keyHex.slice(i, i + 2), 16));
				}
				const encBytes = [];
				for (let i = 0; i < ENCRYPTED_GH_TOKEN_HEX.length; i += 2) {
					encBytes.push(parseInt(ENCRYPTED_GH_TOKEN_HEX.slice(i, i + 2), 16));
				}
				const decBytes = new Uint8Array(encBytes.length);
				for (let i = 0; i < encBytes.length; i++) {
					decBytes[i] = encBytes[i] ^ keyBytes[i % keyBytes.length];
				}
				const tokenStr = new TextDecoder().decode(decBytes).trim();
				if (tokenStr.startsWith("github_pat_") || tokenStr.startsWith("ghp_")) {
					return tokenStr;
				}
			} catch (_) {}
			return null;
		},

		_fallbackSha256(ascii) {
			function rightRotate(value, amount) {
				return (value >>> amount) | (value << (32 - amount));
			}
			const mathPow = Math.pow;
			const maxWord = mathPow(2, 32);
			const lengthProperty = "length";
			let i, j;
			let result = "";
			const words = [];
			const asciiBitLength = ascii[lengthProperty] * 8;
			let hash = [];
			const k = [];
			let primeCounter = 0;
			const isComposite = {};
			for (let candidate = 2; primeCounter < 64; candidate++) {
				if (!isComposite[candidate]) {
					for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
					hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
					k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
				}
			}
			ascii += "\x80";
			while ((ascii[lengthProperty] % 64) - 56) ascii += "\x00";
			for (i = 0; i < ascii[lengthProperty]; i++) {
				j = ascii.charCodeAt(i);
				if (j >> 8) return "";
				words[i >> 2] |= j << (((3 - i) % 4) * 8);
			}
			words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
			words[words[lengthProperty]] = asciiBitLength;
			for (j = 0; j < words[lengthProperty]; ) {
				const w = words.slice(j, (j += 16));
				const oldHash = hash;
				hash = hash.slice(0, 8);
				for (i = 0; i < 64; i++) {
					const w15 = w[i - 15],
						w2 = w[i - 2];
					const a = hash[0],
						e = hash[4];
					const temp1 =
						hash[7] +
						(rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
						((e & hash[5]) ^ (~e & hash[6])) +
						k[i] +
						(w[i] =
							i < 16
								? w[i]
								: (w[i - 16] +
										(rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
										w[i - 7] +
										(rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
								  0);
					const temp2 =
						(rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
						((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
					hash = [(temp1 + temp2) | 0].concat(hash);
					hash[4] = (hash[4] + temp1) | 0;
				}
				for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
			}
			for (i = 0; i < 8; i++) {
				for (j = 3; j + 1; j--) {
					const b = (hash[i] >> (j * 8)) & 255;
					result += (b < 16 ? 0 : "") + b.toString(16);
				}
			}
			return result;
		},

		_xorBytes(bytes, salt1, salt2) {
			const keyBytes = new TextEncoder().encode(CIPHER_SECRET);
			const out = new Uint8Array(bytes.length);
			for (let i = 0; i < bytes.length; i++) {
				const k1 = keyBytes[(i + salt1) % keyBytes.length];
				const k2 = (salt2 * 31 + i * 17) & 0xff;
				out[i] = bytes[i] ^ k1 ^ k2;
			}
			return out;
		},

		_toBase64Url(uint8) {
			let bin = "";
			for (let i = 0; i < uint8.length; i++) bin += String.fromCharCode(uint8[i]);
			return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
		},

		_fromBase64Url(b64url) {
			let b64 = String(b64url || "")
				.trim()
				.replace(/-/g, "+")
				.replace(/_/g, "/");
			while (b64.length % 4 !== 0) b64 += "=";
			const bin = atob(b64);
			const out = new Uint8Array(bin.length);
			for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
			return out;
		},

		encodeChallenge(payload) {
			const passStr = String(payload.password || "").trim();
			const lockType = payload.lockType || (/^\d{4}$/.test(passStr) ? "comb" : "pass");
			const clean = {
				p: passStr,
				l: lockType,
				g: payload.gameId || "crack",
				d: Number(payload.difficulty || 2),
				v: String(payload.victim || "").trim(),
				n: String(payload.lockLabel || payload.note || "").trim(),
				cid: String(payload.cid || ("L" + Date.now().toString(36).slice(-4).toUpperCase()))
			};

			const rawStr = `V2|${clean.p}|${clean.l}|${clean.g}|${clean.d}|${clean.v}|${clean.n}|${clean.cid}`;

			const salt1 = Math.floor(Math.random() * 250) + 1;
			const salt2 = Math.floor(Math.random() * 250) + 1;
			const rawBytes = new TextEncoder().encode(rawStr);
			const encBytes = this._xorBytes(rawBytes, salt1, salt2);

			let checksum = (salt1 ^ salt2) & 0xff;
			for (let i = 0; i < rawBytes.length; i++) {
				checksum = (checksum + rawBytes[i] * (i + 3)) & 0xff;
			}

			const finalBytes = new Uint8Array(encBytes.length + 3);
			finalBytes[0] = salt1;
			finalBytes[1] = salt2;
			finalBytes[2] = checksum;
			finalBytes.set(encBytes, 3);

			const token = this._toBase64Url(finalBytes);
			const ticket = "BC-" + token;

			BC_GAMES_LOGGER.log("CRYPTO", "Encoded challenge", {
				cid: clean.cid,
				lockType: clean.l,
				gameId: clean.g,
				difficulty: clean.d,
				victim: clean.v || "(any)",
				lockLabel: clean.n || ""
			});
			return { token, ticket, cid: clean.cid };
		},

		decodeChallenge(inputStr, silent = false) {
			if (!inputStr) return null;
			let rawToken = String(inputStr).trim();

			if (rawToken.includes("?c=") || rawToken.includes("&c=")) {
				try {
					const u = new URL(rawToken);
					rawToken = u.searchParams.get("c") || rawToken;
				} catch (_) {
					const m = rawToken.match(/[?&]c=([^&#\s]+)/);
					if (m) rawToken = m[1];
				}
			}

			if (rawToken.toUpperCase().startsWith("BC-")) {
				rawToken = rawToken.slice(3);
			}

			try {
				const bytes = this._fromBase64Url(rawToken);
				if (bytes.length < 6) throw new Error("Token too short");
				const salt1 = bytes[0];
				const salt2 = bytes[1];
				const expectedChecksum = bytes[2];
				const encBytes = bytes.slice(3);
				const decBytes = this._xorBytes(encBytes, salt1, salt2);

				let actualChecksum = (salt1 ^ salt2) & 0xff;
				for (let i = 0; i < decBytes.length; i++) {
					actualChecksum = (actualChecksum + decBytes[i] * (i + 3)) & 0xff;
				}
				if (actualChecksum !== expectedChecksum) {
					throw new Error("Invalid checksum");
				}

				const decodedStr = new TextDecoder().decode(decBytes);
				if (decodedStr.startsWith("V2|")) {
					const parts = decodedStr.split("|");
					return {
						password: parts[1] || "",
						lockType: parts[2] || "comb",
						gameId: parts[3] || "crack",
						difficulty: Number(parts[4] || 2),
						victim: parts[5] || "",
						lockLabel: parts[6] || "",
						note: parts[6] || "",
						cid: parts[7] || ""
					};
				}
				if (decodedStr.startsWith("V1|")) {
					const parts = decodedStr.split("|");
					return {
						password: parts[1] || "",
						lockType: parts[2] || "comb",
						gameId: parts[3] || "crack",
						difficulty: Number(parts[4] || 2),
						victim: parts[5] || "",
						lockLabel: parts.slice(6).join("|") || "",
						note: parts.slice(6).join("|") || ""
					};
				}

				const parsed = JSON.parse(decodedStr);
				return {
					password: parsed.p || "",
					lockType: parsed.l || "comb",
					gameId: parsed.g || "crack",
					difficulty: Number(parsed.d || 2),
					victim: parsed.v || "",
					lockLabel: parsed.n || "",
					note: parsed.n || "",
					cid: parsed.cid || ""
				};
			} catch (err) {
				if (!silent) {
					BC_GAMES_LOGGER.log("WARN", "Failed to decode challenge token", {
						input: String(inputStr).slice(0, 40),
						error: err.message
					});
				}
				return null;
			}
		}
	};

	/* =========================================================================
	 * 4. REGISTRO CENTRALE PLUG & PLAY DEI MINIGIOCHI (BC_GAMES_REGISTRY)
	 * ========================================================================= */
	const BC_GAMES_REGISTRY = {
		games: new Map(),

		register(gameDef) {
			if (!gameDef || !gameDef.id) {
				throw new Error("Game definition requires a unique 'id'");
			}
			this.games.set(gameDef.id, gameDef);
			BC_GAMES_LOGGER.log("SYSTEM", `Registered minigame module: ${gameDef.id} (${gameDef.title})`);
		},

		get(id) {
			return this.games.get(id) || null;
		},

		getAll() {
			return Array.from(this.games.values());
		}
	};

	/* =========================================================================
	 * 5A. MINIGIOCO 1: CRACK THE PADLOCK (Mastermind / Wordle)
	 * ========================================================================= */
	const CRACK_BC_WORDS = [
		"LATEX", "CUFFS", "BOUND", "ROPEY", "LOCKS", "CHAINS",
		"STRAP", "COLLAR", "KNEEL", "HEELS", "MAIDS", "GAGGED",
		"MITTS", "HOODS", "LEASH", "CELLS", "BLIND", "ANKLE"
	];

	BC_GAMES_REGISTRY.register({
		id: "crack",
		title: "Crack the Padlock",
		icon: "🔢",
		badge: "Codebreaker",
		description: "Guess the hidden lock code: Green = right spot, Yellow = right digit/letter in another spot.",
		configSchema: {
			maxAttempts: { label: "Max Attempts", type: "number", default: 6, min: 3, max: 12 },
			codeLength: { label: "Digits Count (4 or 5)", type: "number", default: 4, min: 4, max: 5 },
			defaultMode: { label: "Mode (digits = Numbers, words = Words)", type: "select", options: ["digits", "words"], default: "digits" },
			showColorHints: { label: "Show Yellow Hints", type: "boolean", default: true }
		},

		mount(container, runtimeCfg, difficulty, onWin, onLose) {
			const mode = runtimeCfg.defaultMode === "words" ? "words" : "digits";
			const len = mode === "words" ? 5 : Math.min(5, Math.max(4, Number(runtimeCfg.codeLength) || 4));
			const baseAttempts = Number(runtimeCfg.maxAttempts) || 6;
			const maxAttempts = difficulty === 1 ? baseAttempts + 2 : difficulty === 3 ? Math.max(4, baseAttempts - 1) : baseAttempts;

			let secret = "";
			if (mode === "words") {
				const words5 = CRACK_BC_WORDS.filter((w) => w.length === 5);
				secret = words5[Math.floor(Math.random() * words5.length)] || "LATEX";
			} else {
				for (let i = 0; i < len; i++) {
					secret += String(Math.floor(Math.random() * 10));
				}
			}

			let currentGuess = "";
			let attemptsUsed = 0;
			let gameOver = false;
			const keyStates = {};

			BC_GAMES_LOGGER.log("GAME", "Started Crack the Padlock", { mode, len, maxAttempts, difficulty });

			container.innerHTML = `
				<div class="mg-header-bar">
					<div>
						<span class="mg-tag">🔒 ${mode === "words" ? "5-Letter Word" : `${len}-Digit Code`}</span>
						<span class="mg-tag">Attempts: <strong id="crack-att-cnt">0 / ${maxAttempts}</strong></span>
					</div>
					<div class="mg-legend">
						<span class="leg-item"><i class="dot green"></i> Exact Spot</span>
						${runtimeCfg.showColorHints !== false ? `<span class="leg-item"><i class="dot yellow"></i> Wrong Spot</span>` : ""}
						<span class="leg-item"><i class="dot gray"></i> Not in Code</span>
					</div>
				</div>
				<div id="crack-board" class="crack-board"></div>
				<div id="crack-keypad" class="crack-keypad"></div>
			`;

			const boardEl = container.querySelector("#crack-board");
			const keypadEl = container.querySelector("#crack-keypad");
			const attCntEl = container.querySelector("#crack-att-cnt");

			const rows = [];
			for (let r = 0; r < maxAttempts; r++) {
				const rowEl = document.createElement("div");
				rowEl.className = "crack-row";
				const cells = [];
				for (let c = 0; c < len; c++) {
					const cell = document.createElement("div");
					cell.className = "crack-cell";
					rowEl.appendChild(cell);
					cells.push(cell);
				}
				boardEl.appendChild(rowEl);
				rows.push(cells);
			}

			function renderCurrentRow() {
				if (gameOver || attemptsUsed >= maxAttempts) return;
				const activeCells = rows[attemptsUsed];
				for (let c = 0; c < len; c++) {
					const ch = currentGuess[c] || "";
					activeCells[c].textContent = ch;
					activeCells[c].classList.toggle("filled", !!ch);
					activeCells[c].classList.toggle("active-cursor", c === currentGuess.length);
				}
			}

			function evaluateGuess(guess) {
				const res = new Array(len).fill("absent");
				const secretArr = secret.split("");
				const guessArr = guess.split("");
				const usedSecret = new Array(len).fill(false);

				for (let i = 0; i < len; i++) {
					if (guessArr[i] === secretArr[i]) {
						res[i] = "correct";
						usedSecret[i] = true;
					}
				}
				if (runtimeCfg.showColorHints !== false) {
					for (let i = 0; i < len; i++) {
						if (res[i] === "correct") continue;
						for (let j = 0; j < len; j++) {
							if (!usedSecret[j] && guessArr[i] === secretArr[j]) {
								res[i] = "present";
								usedSecret[j] = true;
								break;
							}
						}
					}
				}
				return res;
			}

			function updateKeypadColors() {
				keypadEl.querySelectorAll("[data-key]").forEach((btn) => {
					const k = btn.getAttribute("data-key");
					const st = keyStates[k];
					btn.classList.remove("k-correct", "k-present", "k-absent");
					if (st) btn.classList.add(`k-${st}`);
				});
			}

			function submitGuess() {
				if (gameOver || currentGuess.length !== len) return;
				const feedback = evaluateGuess(currentGuess);
				const activeCells = rows[attemptsUsed];

				for (let i = 0; i < len; i++) {
					const ch = currentGuess[i];
					const st = feedback[i];
					activeCells[i].classList.remove("active-cursor");
					activeCells[i].classList.add(`cell-${st}`);

					const prev = keyStates[ch];
					if (st === "correct" || (st === "present" && prev !== "correct") || (!prev && st === "absent")) {
						keyStates[ch] = st;
					}
				}
				updateKeypadColors();

				const won = currentGuess === secret;
				attemptsUsed++;
				attCntEl.textContent = `${attemptsUsed} / ${maxAttempts}`;

				if (won) {
					gameOver = true;
					BC_SOUND_FX.unlockSuccess();
					BC_GAMES_LOGGER.log("GAME", "Crack the Padlock WON", { attemptsUsed, secret });
					setTimeout(() => onWin({ attemptsUsed, secret }), 350);
					return;
				}

				if (attemptsUsed >= maxAttempts) {
					gameOver = true;
					BC_SOUND_FX.errorBuzz();
					BC_GAMES_LOGGER.log("GAME", "Crack the Padlock LOST", { attemptsUsed, secret });
					setTimeout(() => onLose({ reason: `Out of attempts! The lock mechanism code was ${secret}.` }), 400);
					return;
				}

				BC_SOUND_FX.tumblerMatch();
				currentGuess = "";
				renderCurrentRow();
			}

			function handleInput(key) {
				if (gameOver) return;
				if (key === "BACK") {
					if (currentGuess.length > 0) {
						currentGuess = currentGuess.slice(0, -1);
						BC_SOUND_FX.click();
						renderCurrentRow();
					}
					return;
				}
				if (key === "ENTER") {
					if (currentGuess.length === len) {
						submitGuess();
					} else {
						BC_SOUND_FX.errorBuzz();
					}
					return;
				}
				if (currentGuess.length < len) {
					currentGuess += key;
					BC_SOUND_FX.click();
					renderCurrentRow();
				}
			}

			const keys = mode === "words"
				? ["Q","W","E","R","T","Y","U","I","O","P","A","S","D","F","G","H","J","K","L","BACK","Z","X","C","V","B","N","M","ENTER"]
				: ["1","2","3","4","5","6","7","8","9","BACK","0","ENTER"];

			keypadEl.className = `crack-keypad ${mode === "words" ? "kp-words" : "kp-digits"}`;
			keys.forEach((k) => {
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "kp-btn" + (k === "ENTER" ? " kp-enter" : k === "BACK" ? " kp-back" : "");
				btn.setAttribute("data-key", k);
				btn.textContent = k === "BACK" ? "⌫" : k === "ENTER" ? "TRY CODE 🔓" : k;
				btn.addEventListener("click", () => handleInput(k));
				keypadEl.appendChild(btn);
			});

			const keyHandler = (e) => {
				if (gameOver) return;
				if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
				if (e.key === "Backspace") {
					e.preventDefault();
					handleInput("BACK");
				} else if (e.key === "Enter") {
					e.preventDefault();
					handleInput("ENTER");
				} else {
					const up = e.key.toUpperCase();
					if (mode === "digits" && /^[0-9]$/.test(up)) handleInput(up);
					if (mode === "words" && /^[A-Z]$/.test(up)) handleInput(up);
				}
			};
			window.addEventListener("keydown", keyHandler);
			renderCurrentRow();

			return {
				cleanup() {
					gameOver = true;
					window.removeEventListener("keydown", keyHandler);
				}
			};
		}
	});

	/* =========================================================================
	 * 5B. MINIGIOCO 2: STRUGGLE & ESCAPE (Reflexes, Tension & Vibrator Surge)
	 * ========================================================================= */
	BC_GAMES_REGISTRY.register({
		id: "struggle",
		title: "Struggle & Escape",
		icon: "⛓️",
		badge: "Reflexes",
		description: "Press SPACE or click when the white marker hits the green zone to loosen the straps while resisting vibration surges!",
		configSchema: {
			strapsCount: { label: "Straps to Unbuckle", type: "number", default: 3, min: 1, max: 6 },
			baseSpeed: { label: "Cursor Speed", type: "number", default: 1.35, min: 0.6, max: 3.0, step: 0.1 },
			sweetSpotWidth: { label: "Green Zone Width (%)", type: "number", default: 22, min: 10, max: 40 },
			fatiguePenalty: { label: "Miss Penalty (%)", type: "number", default: 18, min: 5, max: 50 },
			vibratorChance: { label: "Vibrator Surge Chance (0-1)", type: "number", default: 0.45, min: 0, max: 1, step: 0.05 }
		},

		mount(container, runtimeCfg, difficulty, onWin, onLose) {
			const totalStraps = Math.max(1, Math.min(6, Number(runtimeCfg.strapsCount) || 3));
			const diffMult = difficulty === 1 ? 0.8 : difficulty === 3 ? 1.3 : 1.0;
			const baseSpeed = (Number(runtimeCfg.baseSpeed) || 1.35) * diffMult;
			const spotWidth = Math.max(10, Math.min(40, (Number(runtimeCfg.sweetSpotWidth) || 22) / diffMult));
			const penalty = Number(runtimeCfg.fatiguePenalty) || 18;
			const vibeChance = Number(runtimeCfg.vibratorChance ?? 0.45);

			let currentStrap = 0;
			let strapProgress = 0;
			let fatigue = 0;
			let cursorPos = 10;
			let cursorDir = 1;
			let targetStart = 40;
			let vibeLevel = 0;
			let animId = null;
			let vibeTimer = null;
			let gameOver = false;

			const strapNames = [
				"Wrist Strap (Leather Cuffs)",
				"Elbow Strap (Armbinder Buckle)",
				"Waist & Thigh Strap (Sturdy Leather Belt)",
				"Ankle Strap (Linked Ankle Cuffs)",
				"Neck Strap (Posture Collar)",
				"Chest Strap (Latex Harness)"
			];

			BC_GAMES_LOGGER.log("GAME", "Started Struggle & Escape", { totalStraps, baseSpeed, spotWidth, difficulty });

			container.innerHTML = `
				<div id="strug-arena" class="strug-arena">
					<div class="mg-header-bar">
						<div>
							<span class="mg-tag">⛓️ Strap: <strong id="strug-strap-idx">1 / ${totalStraps}</strong></span>
							<span id="strug-vibe-badge" class="mg-tag vibe-off">💓 Vibrator: Off</span>
						</div>
						<div>
							<span class="mg-tag">Fatigue: <strong id="strug-fat-txt">0%</strong></span>
						</div>
					</div>

					<div id="strug-strap-title" class="strug-strap-title">${strapNames[0]}</div>
					<div class="strug-buckles-row" id="strug-buckles"></div>

					<div class="strug-track-wrap">
						<div class="strug-track">
							<div id="strug-zone" class="strug-zone"></div>
							<div id="strug-cursor" class="strug-cursor"></div>
						</div>
					</div>

					<div class="strug-bars-grid">
						<div class="strug-bar-box">
							<div class="strug-bar-label"><span>Buckle Loosened</span><span id="strug-prog-txt">0%</span></div>
							<div class="strug-bar-bg"><div id="strug-prog-fill" class="strug-bar-fill fill-green" style="width:0%"></div></div>
						</div>
						<div class="strug-bar-box">
							<div class="strug-bar-label"><span>Muscle Fatigue (Max 100%)</span><span id="strug-fat-bar-txt">0%</span></div>
							<div class="strug-bar-bg"><div id="strug-fat-fill" class="strug-bar-fill fill-red" style="width:0%"></div></div>
						</div>
					</div>

					<button type="button" id="strug-hit-btn" class="btn btn-primary strug-hit-btn">
						⚡ PULL STRAP NOW! (Space / Click)
					</button>
				</div>
			`;

			const arenaEl = container.querySelector("#strug-arena");
			const zoneEl = container.querySelector("#strug-zone");
			const cursorEl = container.querySelector("#strug-cursor");
			const strapIdxEl = container.querySelector("#strug-strap-idx");
			const strapTitleEl = container.querySelector("#strug-strap-title");
			const bucklesEl = container.querySelector("#strug-buckles");
			const progFillEl = container.querySelector("#strug-prog-fill");
			const progTxtEl = container.querySelector("#strug-prog-txt");
			const fatFillEl = container.querySelector("#strug-fat-fill");
			const fatTxtEl = container.querySelector("#strug-fat-txt");
			const fatBarTxtEl = container.querySelector("#strug-fat-bar-txt");
			const vibeBadgeEl = container.querySelector("#strug-vibe-badge");
			const hitBtn = container.querySelector("#strug-hit-btn");

			function renderBuckles() {
				bucklesEl.innerHTML = "";
				for (let i = 0; i < totalStraps; i++) {
					const b = document.createElement("div");
					b.className = "buckle-pill" + (i < currentStrap ? " unlocked" : i === currentStrap ? " current" : "");
					b.textContent = i < currentStrap ? `🔓 Buckle ${i + 1}` : `🔒 Buckle ${i + 1}`;
					bucklesEl.appendChild(b);
				}
			}

			function randomizeSweetSpot() {
				targetStart = Math.floor(Math.random() * (86 - spotWidth)) + 7;
				zoneEl.style.left = `${targetStart}%`;
				zoneEl.style.width = `${spotWidth}%`;
			}

			function updateBars() {
				progFillEl.style.width = `${strapProgress}%`;
				progTxtEl.textContent = `${strapProgress}%`;
				fatFillEl.style.width = `${fatigue}%`;
				fatTxtEl.textContent = `${fatigue}%`;
				fatBarTxtEl.textContent = `${fatigue}%`;
				strapIdxEl.textContent = `${Math.min(totalStraps, currentStrap + 1)} / ${totalStraps}`;
				strapTitleEl.textContent = strapNames[currentStrap % strapNames.length];
				renderBuckles();
			}

			vibeTimer = setInterval(() => {
				if (gameOver) return;
				if (Math.random() < vibeChance) {
					vibeLevel = Math.floor(Math.random() * 3) + 1;
					const labels = ["Off", "Low 💓", "Medium 💓💓", "MAXIMUM 💓🔥"];
					vibeBadgeEl.textContent = `💓 Vibrator: ${labels[vibeLevel]}`;
					vibeBadgeEl.className = `mg-tag vibe-lv${vibeLevel}`;
					arenaEl.classList.toggle("vibe-shake", vibeLevel >= 2);
					BC_SOUND_FX.vibePulse(vibeLevel);
				} else {
					vibeLevel = 0;
					vibeBadgeEl.textContent = "💓 Vibrator: Off";
					vibeBadgeEl.className = "mg-tag vibe-off";
					arenaEl.classList.remove("vibe-shake");
				}
			}, 2200);

			function step() {
				if (gameOver) return;
				const vibeJitter = vibeLevel === 3 ? 1.45 : vibeLevel === 2 ? 1.2 : 1.0;
				const strapFactor = 1 + currentStrap * 0.14;
				cursorPos += cursorDir * baseSpeed * vibeJitter * strapFactor;
				if (cursorPos >= 98) {
					cursorPos = 98;
					cursorDir = -1;
				} else if (cursorPos <= 2) {
					cursorPos = 2;
					cursorDir = 1;
				}
				cursorEl.style.left = `${cursorPos}%`;
				animId = requestAnimationFrame(step);
			}

			function triggerPull() {
				if (gameOver) return;
				const hit = cursorPos >= targetStart - 1.5 && cursorPos <= targetStart + spotWidth + 1.5;

				if (hit) {
					strapProgress = Math.min(100, strapProgress + 34);
					BC_SOUND_FX.strapLoosen();
					randomizeSweetSpot();

					if (strapProgress >= 100) {
						currentStrap++;
						strapProgress = 0;
						fatigue = Math.max(0, fatigue - 12);

						if (currentStrap >= totalStraps) {
							gameOver = true;
							arenaEl.classList.remove("vibe-shake");
							updateBars();
							BC_SOUND_FX.unlockSuccess();
							BC_GAMES_LOGGER.log("GAME", "Struggle & Escape WON", { totalStraps, fatigue });
							setTimeout(() => onWin({ totalStraps, fatigue }), 350);
							return;
						}
					}
				} else {
					fatigue = Math.min(100, fatigue + penalty);
					strapProgress = Math.max(0, strapProgress - 15);
					BC_SOUND_FX.errorBuzz();

					if (fatigue >= 100) {
						gameOver = true;
						arenaEl.classList.remove("vibe-shake");
						updateBars();
						BC_GAMES_LOGGER.log("GAME", "Struggle & Escape LOST (Max Fatigue)", { currentStrap });
						setTimeout(() => onLose({ reason: "Exhausted! The leather straps snapped back tight." }), 350);
						return;
					}
				}
				updateBars();
			}

			hitBtn.addEventListener("click", triggerPull);
			const keyHandler = (e) => {
				if (gameOver) return;
				if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
				if (e.code === "Space") {
					e.preventDefault();
					triggerPull();
				}
			};
			window.addEventListener("keydown", keyHandler);

			randomizeSweetSpot();
			updateBars();
			animId = requestAnimationFrame(step);

			return {
				cleanup() {
					gameOver = true;
					if (animId) cancelAnimationFrame(animId);
					if (vibeTimer) clearInterval(vibeTimer);
					window.removeEventListener("keydown", keyHandler);
				}
			};
		}
	});

	/* =========================================================================
	 * 5C. MINIGIOCO 3: GAG SPEAK HANGMAN (Decode the Muffled Phrase)
	 * ========================================================================= */
	const GAG_STAGES = [
		{ level: 0, name: "Ungagged", icon: "🗣️", desc: "Free to speak clearly" },
		{ level: 1, name: "Cloth Gag", icon: "🧣", desc: "Simple cloth tied across the mouth" },
		{ level: 2, name: "Ball Gag Tight", icon: "🔴", desc: "Classic red ball gag buckled tight" },
		{ level: 3, name: "Harness Ball Gag", icon: "⛓️", desc: "Multi-strap leather head harness" },
		{ level: 4, name: "Duct Tape", icon: "🩹", desc: "Heavy layers of sticky tape" },
		{ level: 5, name: "Muzzle Gag", icon: "😷", desc: "Reinforced leather muzzle" },
		{ level: 6, name: "Total Silence Hood!", icon: "🔒", desc: "Completely sealed latex hood!" }
	];

	function toBondageClubGagSpeak(phrase) {
		const map = {
			A: "ah", B: "mh", C: "kh", D: "nh", E: "eh", F: "ph", G: "gh",
			H: "hh", I: "ih", J: "jh", K: "kh", L: "lh", M: "mm", N: "nn",
			O: "oh", P: "mp", Q: "kw", R: "rh", S: "sh", T: "th", U: "uh",
			V: "vh", W: "wh", X: "ks", Y: "yh", Z: "zh"
		};
		return String(phrase || "")
			.toUpperCase()
			.split(" ")
			.map((word) => {
				if (!word) return "";
				const converted = word
					.split("")
					.map((ch, idx) => {
						if (!/[A-Z]/.test(ch)) return ch;
						if (idx === 0) return (map[ch] || "mm").charAt(0).toUpperCase() + (map[ch] || "mm").slice(1);
						return idx % 2 === 0 ? "m" : "h";
					})
					.join("");
				return converted + "ph";
			})
			.join(" ") + "... mmph!";
	}

	BC_GAMES_REGISTRY.register({
		id: "gagspeak",
		title: "Gag Speak Hangman",
		icon: "🙊",
		badge: "Word Puzzle",
		description: "Guess the letters of the Bondage Club phrase before the gag gets locked to maximum tightness!",
		configSchema: {
			maxErrors: { label: "Max Allowed Mistakes", type: "number", default: 6, min: 3, max: 8 },
			showCategoryHint: { label: "Show Category Clue", type: "boolean", default: true },
			showMuffledPreview: { label: "Show Muffled Gag-Speak Bubble", type: "boolean", default: true }
		},

		mount(container, runtimeCfg, difficulty, onWin, onLose, appConfig) {
			const pool = (appConfig && Array.isArray(appConfig.customPhrases) && appConfig.customPhrases.length > 0)
				? appConfig.customPhrases
				: [
					{ phrase: "THANK YOU MISS", category: "Club Etiquette & Discipline" },
					{ phrase: "LATEX ARMBINDER", category: "Arm Restraint (ItemArms)" },
					{ phrase: "COMBINATION PADLOCK", category: "4-Digit Padlock (ItemMisc)" },
					{ phrase: "STURDY LEATHER BELTS", category: "Heavy Leather Straps" }
				];

			const entry = pool[Math.floor(Math.random() * pool.length)];
			const targetPhrase = String(entry.phrase || "LATEX ARMBINDER").toUpperCase().trim();
			const category = entry.category || "Bondage Club";
			const muffled = toBondageClubGagSpeak(targetPhrase);

			const baseMaxErr = Number(runtimeCfg.maxErrors) || 6;
			const maxErrors = difficulty === 1 ? Math.min(8, baseMaxErr + 1) : difficulty === 3 ? Math.max(4, baseMaxErr - 1) : baseMaxErr;

			let errors = 0;
			const guessed = new Set();
			let gameOver = false;

			BC_GAMES_LOGGER.log("GAME", "Started Gag Speak Hangman", { category, maxErrors, difficulty });

			container.innerHTML = `
				<div class="mg-header-bar">
					<div>
						<span class="mg-tag">🙊 Mistakes: <strong id="gag-err-cnt">0 / ${maxErrors}</strong></span>
						${runtimeCfg.showCategoryHint !== false ? `<span class="mg-tag">💡 Clue: <strong>${category}</strong></span>` : ""}
					</div>
				</div>

				<div class="gag-status-card" id="gag-status-card">
					<div class="gag-avatar-icon" id="gag-icon">🗣️</div>
					<div class="gag-status-info">
						<div class="gag-stage-name" id="gag-stage-name">Ungagged</div>
						<div class="gag-stage-desc" id="gag-stage-desc">Pick letters on the keyboard below!</div>
						${runtimeCfg.showMuffledPreview !== false ? `<div class="gag-bubble">"${muffled}"</div>` : ""}
					</div>
				</div>

				<div id="gag-word-box" class="gag-word-box"></div>
				<div id="gag-keyboard" class="crack-keypad kp-words"></div>
			`;

			const errCntEl = container.querySelector("#gag-err-cnt");
			const iconEl = container.querySelector("#gag-icon");
			const stageNameEl = container.querySelector("#gag-stage-name");
			const stageDescEl = container.querySelector("#gag-stage-desc");
			const wordBoxEl = container.querySelector("#gag-word-box");
			const kbEl = container.querySelector("#gag-keyboard");

			function updateGagStatus() {
				errCntEl.textContent = `${errors} / ${maxErrors}`;
				const stageIdx = Math.min(GAG_STAGES.length - 1, Math.round((errors / maxErrors) * (GAG_STAGES.length - 1)));
				const st = GAG_STAGES[stageIdx];
				iconEl.textContent = st.icon;
				stageNameEl.textContent = `${st.name} (Mistakes: ${errors}/${maxErrors})`;
				stageDescEl.textContent = st.desc;
			}

			function renderPhrase() {
				wordBoxEl.innerHTML = "";
				const words = targetPhrase.split(" ");
				words.forEach((w) => {
					const wWrap = document.createElement("div");
					wWrap.className = "gag-word-group";
					for (const ch of w) {
						const slot = document.createElement("span");
						const isShown = !/[A-Z]/.test(ch) || guessed.has(ch);
						slot.className = "gag-letter-slot" + (isShown ? " revealed" : "");
						slot.textContent = isShown ? ch : "_";
						wWrap.appendChild(slot);
					}
					wordBoxEl.appendChild(wWrap);
				});
			}

			function isAllRevealed() {
				for (const ch of targetPhrase) {
					if (/[A-Z]/.test(ch) && !guessed.has(ch)) return false;
				}
				return true;
			}

			function guessLetter(ch, btnEl) {
				if (gameOver || guessed.has(ch)) return;
				guessed.add(ch);

				if (targetPhrase.includes(ch)) {
					if (btnEl) btnEl.classList.add("k-correct");
					BC_SOUND_FX.tumblerMatch();
					renderPhrase();
					if (isAllRevealed()) {
						gameOver = true;
						BC_SOUND_FX.unlockSuccess();
						BC_GAMES_LOGGER.log("GAME", "Gag Speak Hangman WON", { targetPhrase, errors });
						setTimeout(() => onWin({ targetPhrase, errors }), 350);
					}
				} else {
					errors++;
					if (btnEl) btnEl.classList.add("k-absent");
					BC_SOUND_FX.errorBuzz();
					updateGagStatus();

					if (errors >= maxErrors) {
						gameOver = true;
						for (const c of targetPhrase) guessed.add(c);
						renderPhrase();
						BC_GAMES_LOGGER.log("GAME", "Gag Speak Hangman LOST", { targetPhrase, errors });
						setTimeout(() => onLose({ reason: `Too many mistakes! The secret phrase was "${targetPhrase}".` }), 450);
					}
				}
			}

			"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((letter) => {
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "kp-btn";
				btn.setAttribute("data-letter", letter);
				btn.textContent = letter;
				btn.addEventListener("click", () => guessLetter(letter, btn));
				kbEl.appendChild(btn);
			});

			const keyHandler = (e) => {
				if (gameOver) return;
				if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
				const up = e.key.toUpperCase();
				if (/^[A-Z]$/.test(up)) {
					const btn = kbEl.querySelector(`[data-letter="${up}"]`);
					guessLetter(up, btn);
				}
			};
			window.addEventListener("keydown", keyHandler);

			updateGagStatus();
			renderPhrase();

			return {
				cleanup() {
					gameOver = true;
					window.removeEventListener("keydown", keyHandler);
				}
			};
		}
	});

	/* =========================================================================
	 * 6. CONTROLLER PRINCIPALE DELL'APPLICAZIONE (BC_APP_CONTROLLER)
	 * ========================================================================= */
	const BC_APP_CONTROLLER = {
		config: null,
		activeGameInstance: null,
		activeChallenge: null,
		currentMatchedList: [],
		currentQueryId: "",
		solvedMap: {}, // Memorizza i lucchetti già sbloccati nella sessione: { cid: password }
		gauntletQueue: [],
		gauntletIndex: 0,
		isAdmin: false,

		async init() {
			BC_GAMES_LOGGER.init();
			await this.loadConfig();

			try {
				if (sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === "true") {
					this.isAdmin = true;
				}
				const savedSolved = sessionStorage.getItem(STORAGE_KEYS.SOLVED_LOCKS);
				if (savedSolved) this.solvedMap = JSON.parse(savedSolved) || {};
			} catch (_) {}

			this.bindNavigation();
			this.renderArcadeGrid();
			this.initLockmasterForm();
			this.initLookupBox();
			this.initAdminPanel();

			const params = new URLSearchParams(window.location.search);
			const cParam = params.get("c");
			const idParam = params.get("id");

			if (cParam) {
				this.launchChallengeFromToken(cParam, "URL ?c= parameter");
			} else if (idParam) {
				const inp = document.getElementById("victim-lookup-input");
				if (inp) inp.value = idParam;
				this.lookupChallengeByInput(idParam);
			}
		},

		// Normalizza qualsiasi voce di victimChallenges in un Array di lucchetti
		_normalizeChallengeList(entryOrArray, key) {
			if (!entryOrArray) return [];
			const arr = Array.isArray(entryOrArray) ? entryOrArray : [entryOrArray];
			return arr
				.filter((item) => item && item.ticket)
				.map((item, idx) => ({
					cid: item.cid || `L${idx + 1}`,
					playerId: item.playerId || item.label || key,
					lockLabel: item.lockLabel || item.note || `Lock #${idx + 1}`,
					gameId: item.gameId || "crack",
					difficulty: Number(item.difficulty || 2),
					ticket: item.ticket,
					createdAt: item.createdAt || new Date().toISOString()
				}));
		},

		async loadConfig() {
			const defaultCfg = {
				version: "1.2.0",
				games: {
					crack: { enabled: true, maxAttempts: 6, codeLength: 4, defaultMode: "digits", showColorHints: true },
					struggle: { enabled: true, strapsCount: 3, baseSpeed: 1.35, sweetSpotWidth: 22, fatiguePenalty: 18, vibratorChance: 0.45 },
					gagspeak: { enabled: true, maxErrors: 6, showCategoryHint: true, showMuffledPreview: true }
				},
				customPhrases: [
					{ phrase: "THANK YOU MISS", category: "Club Etiquette & Discipline" },
					{ phrase: "LATEX ARMBINDER", category: "Arm Restraint (ItemArms)" },
					{ phrase: "COMBINATION PADLOCK", category: "4-Digit Padlock (ItemMisc)" },
					{ phrase: "STURDY LEATHER BELTS", category: "Heavy Leather Straps" },
					{ phrase: "BALL GAG TIGHT", category: "Classic Mouth Restraint" },
					{ phrase: "VIBRATING EGG MAXIMUM", category: "Remote Controlled Toy" }
				],
				victimChallenges: {}
			};

			let remoteCfg = null;
			try {
				const res = await fetch(`games-config.json?t=${Date.now()}`);
				if (res.ok) remoteCfg = await res.json();
			} catch (err) {
				BC_GAMES_LOGGER.log("WARN", "Could not fetch games-config.json", { error: err.message });
			}

			let localCfg = null;
			try {
				const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
				if (raw) localCfg = JSON.parse(raw);
			} catch (_) {}

			this.config = Object.assign({}, defaultCfg, remoteCfg || {});
			if (localCfg) {
				this.config.games = Object.assign({}, this.config.games, localCfg.games || {});
				if (Array.isArray(localCfg.customPhrases) && localCfg.customPhrases.length > 0) {
					this.config.customPhrases = localCfg.customPhrases;
				}
			}

			// Unisce in modo pulito gli array di lucchetti remoti + locali per ogni Player ID
			const mergedVictims = {};
			const mergeSource = (srcMap) => {
				if (!srcMap || typeof srcMap !== "object") return;
				for (const [rawKey, val] of Object.entries(srcMap)) {
					const k = String(rawKey).trim().toLowerCase();
					const list = this._normalizeChallengeList(val, rawKey);
					if (!mergedVictims[k]) mergedVictims[k] = [];
					list.forEach((item) => {
						if (!mergedVictims[k].some((existing) => existing.ticket === item.ticket || (existing.cid && existing.cid === item.cid))) {
							mergedVictims[k].push(item);
						}
					});
				}
			};
			mergeSource(remoteCfg && remoteCfg.victimChallenges);
			mergeSource(localCfg && localCfg.victimChallenges);
			this.config.victimChallenges = mergedVictims;

			BC_GAMES_LOGGER.log("SYSTEM", "Configuration loaded", {
				enabledGames: Object.keys(this.config.games).filter((k) => this.config.games[k]?.enabled !== false),
				registeredPlayers: Object.keys(this.config.victimChallenges || {}).length
			});
		},

		saveLocalConfig(autoSyncGitHub = true) {
			try {
				this.config.updatedAt = new Date().toISOString();
				localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
				BC_GAMES_LOGGER.log("SYSTEM", "Saved configuration to localStorage");
				if (autoSyncGitHub && localStorage.getItem(STORAGE_KEYS.GH_TOKEN)) {
					this.syncConfigToGitHub(true);
				}
			} catch (err) {
				BC_GAMES_LOGGER.log("ERROR", "Failed saving config", { error: err.message });
			}
		},

		getEnabledGames() {
			return BC_GAMES_REGISTRY.getAll().filter((g) => {
				const st = this.config.games[g.id];
				return !st || st.enabled !== false;
			});
		},

		switchTab(tabId) {
			if (tabId === "admin") {
				const admSec = document.getElementById("view-admin");
				if (admSec) {
					admSec.style.display = "block";
					this.renderAdminView();
					admSec.scrollIntoView({ behavior: "smooth" });
				}
			}
		},

		bindNavigation() {
			const freeplayBtn = document.getElementById("btn-toggle-freeplay");
			const freeplayDrawer = document.getElementById("freeplay-drawer");
			if (freeplayBtn && freeplayDrawer) {
				freeplayBtn.addEventListener("click", () => {
					const isOpen = freeplayDrawer.style.display !== "none";
					freeplayDrawer.style.display = isOpen ? "none" : "block";
					freeplayBtn.textContent = isOpen
						? "🕹️ Open Free Play Minigames ▾"
						: "🕹️ Hide Free Play Minigames ▴";
				});
			}

			const adminBtn = document.getElementById("btn-toggle-admin");
			const adminSec = document.getElementById("view-admin");
			if (adminBtn && adminSec) {
				adminBtn.addEventListener("click", () => {
					const isOpen = adminSec.style.display !== "none";
					adminSec.style.display = isOpen ? "none" : "block";
					if (!isOpen) {
						this.renderAdminView();
						adminSec.scrollIntoView({ behavior: "smooth" });
					}
				});
			}

			const muteBtn = document.getElementById("btn-toggle-audio");
			if (muteBtn) {
				muteBtn.addEventListener("click", () => {
					BC_SOUND_FX.muted = !BC_SOUND_FX.muted;
					muteBtn.textContent = BC_SOUND_FX.muted ? "🔇 Audio Off" : "🔊 Audio";
				});
			}
		},

		/* ---------------------------------------------------------------------
		 * RICERCA MULTI-LUCCHETTO PER PLAYER ID / HINT / LINK
		 * --------------------------------------------------------------------- */
		initLookupBox() {
			const inputEl = document.getElementById("victim-lookup-input");
			const btnEl = document.getElementById("victim-lookup-btn");
			if (!inputEl || !btnEl) return;

			btnEl.addEventListener("click", () => this.lookupChallengeByInput(inputEl.value));
			inputEl.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					this.lookupChallengeByInput(inputEl.value);
				}
			});
		},

		lookupChallengeByInput(rawInput) {
			const val = String(rawInput || "").trim();
			const valLow = val.toLowerCase();
			const feedbackEl = document.getElementById("victim-lookup-feedback");
			const multiBoxEl = document.getElementById("victim-locks-selector");

			if (multiBoxEl) multiBoxEl.style.display = "none";

			if (!val) {
				if (feedbackEl) {
					feedbackEl.textContent = "⚠️ Please enter your Player ID or Clue Code.";
					feedbackEl.className = "lookup-feedback error";
				}
				return;
			}

			BC_GAMES_LOGGER.log("CHALLENGE", "Player lock lookup requested", { query: val });

			// 1. Cerca tutti i lucchetti associati a questo Player ID (o a questo Lock Hint)
			const challengesMap = (this.config && this.config.victimChallenges) || {};
			let matchedList = [];

			if (challengesMap[valLow]) {
				matchedList = this._normalizeChallengeList(challengesMap[valLow], val);
			} else {
				for (const [k, listOrObj] of Object.entries(challengesMap)) {
					const normList = this._normalizeChallengeList(listOrObj, k);
					normList.forEach((item) => {
						const pLow = String(item.playerId || "").toLowerCase();
						const lLow = String(item.lockLabel || "").toLowerCase();
						const cidLow = String(item.cid || "").toLowerCase();
						if (k === valLow || pLow === valLow || lLow === valLow || cidLow === valLow) {
							matchedList.push(item);
						}
					});
				}
			}

			if (matchedList.length > 0) {
				this.currentMatchedList = matchedList;
				this.currentQueryId = val;

				BC_GAMES_LOGGER.log("CHALLENGE", "Found active lock challenges for player", {
					query: val,
					count: matchedList.length
				});

				// Mostra sempre l'elenco dei lucchetti trovati per questo ID (così sa sempre per quale lucchetto gioca!)
				this.renderVictimLocksSelector(val, matchedList);

				if (matchedList.length === 1) {
					if (feedbackEl) {
						feedbackEl.textContent = `✅ Found 1 active lock for "${val}" (${matchedList[0].lockLabel}). Beat the game below to reveal its code!`;
						feedbackEl.className = "lookup-feedback success";
					}
					this.launchChallengeFromToken(matchedList[0].ticket, `Player ID (${val})`, matchedList[0]);
				} else {
					if (feedbackEl) {
						feedbackEl.textContent = `🔐 Found ${matchedList.length} active locks for ID "${val}"! Select which lock you want to unlock below:`;
						feedbackEl.className = "lookup-feedback success";
					}
					// Chiude eventuale gioco precedente finché il player non sceglie quale lucchetto affrontare
					const stageWrap = document.getElementById("active-game-stage-wrap");
					if (stageWrap) stageWrap.style.display = "none";
				}
				return;
			}

			// 2. Prova a decodificarlo come Link Diretto (?c=...) o Ticket (BC-...)
			const decoded = BC_CRYPTO_CODEC.decodeChallenge(val, true);
			if (decoded) {
				BC_GAMES_LOGGER.log("CHALLENGE", "Loaded challenge from direct Ticket/Link");
				if (feedbackEl) {
					feedbackEl.textContent = "✅ Direct challenge loaded! Beat the game below to reveal the code:";
					feedbackEl.className = "lookup-feedback success";
				}
				this.startChallengeSession(decoded, val);
				return;
			}

			BC_GAMES_LOGGER.log("WARN", "No lock challenge found for query", { query: val });
			if (feedbackEl) {
				feedbackEl.textContent = `❌ No active lock found for "${val}". Check your Player ID or ask the lock creator to activate the challenge.`;
				feedbackEl.className = "lookup-feedback error";
			}
		},

		renderVictimLocksSelector(queryId, list) {
			const multiBoxEl = document.getElementById("victim-locks-selector");
			if (!multiBoxEl) return;
			multiBoxEl.style.display = "block";

			const diffNames = { 1: "Easy", 2: "Normal", 3: "Hard" };

			let cardsHtml = "";
			list.forEach((item, idx) => {
				const gameDef = BC_GAMES_REGISTRY.get(item.gameId);
				const gameTitle = item.gameId === "gauntlet"
					? "🏆 Full Gauntlet (All Games)"
					: gameDef
					? `${gameDef.icon} ${gameDef.title}`
					: item.gameId;
				const timeStr = new Date(item.createdAt).toLocaleString([], {
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit"
				});
				const solvedCode = this.solvedMap[item.cid || item.ticket];

				cardsHtml += `
					<div class="vlock-card ${solvedCode ? "vlock-solved" : ""}">
						<div class="vlock-info">
							<div class="vlock-title">
								<span class="badge">#${idx + 1}</span>
								<strong>🔒 ${this._escapeHtml(item.lockLabel || `Lock #${idx + 1}`)}</strong>
							</div>
							<div class="vlock-meta">
								<span>Game: <strong>${this._escapeHtml(gameTitle)}</strong> (${diffNames[item.difficulty] || "Normal"})</span>
								<span>• Created: ${this._escapeHtml(timeStr)}</span>
							</div>
						</div>
						<div class="vlock-action">
							${
								solvedCode
									? `<span class="adm-highlight-code">🔓 Code: ${this._escapeHtml(solvedCode)}</span>`
									: ""
							}
							<button type="button" class="btn btn-primary btn-sm" data-start-lock-idx="${idx}">
								${solvedCode ? "🔄 Replay" : "▶ Play to Unlock"}
							</button>
						</div>
					</div>
				`;
			});

			multiBoxEl.innerHTML = `
				<div class="vlock-header">
					📋 Active Locks for Player ID <strong>${this._escapeHtml(queryId)}</strong> (${list.length}):
				</div>
				<div class="vlock-list">${cardsHtml}</div>
			`;

			multiBoxEl.querySelectorAll("[data-start-lock-idx]").forEach((btn) => {
				btn.addEventListener("click", () => {
					const idx = Number(btn.getAttribute("data-start-lock-idx"));
					const chosen = list[idx];
					if (chosen) {
						this.launchChallengeFromToken(chosen.ticket, `Lock Selector #${idx + 1}`, chosen);
					}
				});
			});
		},

		launchChallengeFromToken(tokenStr, sourceLabel = "Token", metaEntry = null) {
			const decoded = BC_CRYPTO_CODEC.decodeChallenge(tokenStr);
			if (!decoded) {
				const feedbackEl = document.getElementById("victim-lookup-feedback");
				if (feedbackEl) {
					feedbackEl.textContent = "❌ Invalid or incomplete challenge link.";
					feedbackEl.className = "lookup-feedback error";
				}
				return;
			}
			if (metaEntry) {
				decoded.lockLabel = metaEntry.lockLabel || decoded.lockLabel;
				decoded.cid = metaEntry.cid || decoded.cid;
				decoded.victim = metaEntry.playerId || decoded.victim;
			}
			BC_GAMES_LOGGER.log("CHALLENGE", `Started challenge from ${sourceLabel}`, {
				cid: decoded.cid,
				gameId: decoded.gameId,
				difficulty: decoded.difficulty,
				victim: decoded.victim || "(unspecified)",
				lockLabel: decoded.lockLabel || ""
			});
			this.startChallengeSession(decoded, tokenStr);
		},

		/* ---------------------------------------------------------------------
		 * SALA ARCADE & ESECUZIONE MINIGIOCHI
		 * --------------------------------------------------------------------- */
		renderArcadeGrid() {
			const gridEl = document.getElementById("arcade-cards-grid");
			if (!gridEl) return;
			gridEl.innerHTML = "";

			const enabledGames = this.getEnabledGames();
			if (enabledGames.length === 0) {
				gridEl.innerHTML = `<div class="empty-notice">No minigames are currently enabled.</div>`;
				return;
			}

			enabledGames.forEach((g) => {
				const card = document.createElement("div");
				card.className = "game-card";
				card.innerHTML = `
					<div class="gc-top">
						<div class="gc-icon">${g.icon}</div>
						<span class="gc-badge">${g.badge}</span>
					</div>
					<h3>${g.title}</h3>
					<p>${g.description}</p>
					<div class="gc-actions">
						<select class="gc-diff-select" aria-label="Difficulty">
							<option value="1">🟢 Easy</option>
							<option value="2" selected>🟡 Normal</option>
							<option value="3">🔴 Hard</option>
						</select>
						<button type="button" class="btn btn-primary gc-play-btn">▶ Play</button>
					</div>
				`;

				const diffSel = card.querySelector(".gc-diff-select");
				const playBtn = card.querySelector(".gc-play-btn");
				playBtn.addEventListener("click", () => {
					const diff = Number(diffSel.value) || 2;
					this.startFreePlay(g.id, diff);
				});
				gridEl.appendChild(card);
			});

			this.populateGameSelectors();
		},

		populateGameSelectors() {
			const enabled = this.getEnabledGames();
			const selectors = [document.getElementById("lm-game-select")];
			selectors.forEach((sel) => {
				if (!sel) return;
				const currentVal = sel.value;
				sel.innerHTML = "";
				enabled.forEach((g) => {
					const opt = document.createElement("option");
					opt.value = g.id;
					opt.textContent = `${g.icon} ${g.title}`;
					sel.appendChild(opt);
				});
				const optGauntlet = document.createElement("option");
				optGauntlet.value = "gauntlet";
				optGauntlet.textContent = `🏆 All ${enabled.length} Games in a Row (Gauntlet)`;
				sel.appendChild(optGauntlet);

				if (currentVal && Array.from(sel.options).some((o) => o.value === currentVal)) {
					sel.value = currentVal;
				}
			});
		},

		startFreePlay(gameId, difficulty = 2) {
			this.activeChallenge = null;
			this.gauntletQueue = [gameId];
			this.gauntletIndex = 0;
			this._mountCurrentStage(difficulty);
		},

		startChallengeSession(challengeObj, rawTicket = "") {
			this.activeChallenge = Object.assign({}, challengeObj, { rawTicket });
			const enabledIds = this.getEnabledGames().map((g) => g.id);
			if (enabledIds.length === 0) enabledIds.push("crack");

			if (challengeObj.gameId === "gauntlet") {
				this.gauntletQueue = enabledIds;
			} else if (BC_GAMES_REGISTRY.get(challengeObj.gameId)) {
				this.gauntletQueue = [challengeObj.gameId];
			} else {
				this.gauntletQueue = [enabledIds[0]];
			}
			this.gauntletIndex = 0;
			this.switchTab("arcade");
			this._mountCurrentStage(challengeObj.difficulty || 2);
		},

		_mountCurrentStage(difficulty) {
			if (this.activeGameInstance && typeof this.activeGameInstance.cleanup === "function") {
				this.activeGameInstance.cleanup();
				this.activeGameInstance = null;
			}

			const stageWrap = document.getElementById("active-game-stage-wrap");
			const stageTitle = document.getElementById("stage-game-title");
			const stageBanner = document.getElementById("stage-challenge-banner");
			const stageBody = document.getElementById("stage-game-container");
			const stageResult = document.getElementById("stage-result-overlay");
			const adminBypassBtn = document.getElementById("btn-admin-force-win");

			if (!stageWrap || !stageBody) return;
			stageWrap.style.display = "block";
			stageResult.style.display = "none";

			const currentGameId = this.gauntletQueue[this.gauntletIndex];
			const gameDef = BC_GAMES_REGISTRY.get(currentGameId) || BC_GAMES_REGISTRY.get("crack");

			const stepTag = this.gauntletQueue.length > 1
				? ` (Stage ${this.gauntletIndex + 1} of ${this.gauntletQueue.length})`
				: "";
			stageTitle.textContent = `${gameDef.icon} ${gameDef.title}${stepTag}`;

			if (this.activeChallenge) {
				const ch = this.activeChallenge;
				const playerTag = ch.victim ? `Player ID: <strong>${this._escapeHtml(ch.victim)}</strong>` : "";
				const lockTag = ch.lockLabel ? `<span class="badge">🔒 Lock: ${this._escapeHtml(ch.lockLabel)}</span>` : "";
				stageBanner.style.display = "block";
				stageBanner.innerHTML = `
					<div class="ch-banner-main">
						🔐 <strong>LOCK CHALLENGE</strong> ${playerTag} ${lockTag}
						<span class="ch-hint">Win this game to reveal the padlock code!</span>
					</div>
				`;
			} else {
				stageBanner.style.display = "none";
			}

			if (adminBypassBtn) {
				adminBypassBtn.style.display = this.isAdmin ? "inline-flex" : "none";
				adminBypassBtn.onclick = () => {
					BC_GAMES_LOGGER.log("ADMIN", "Admin triggered instant win bypass");
					this._handleStageWin({ adminBypass: true });
				};
			}

			const closeBtn = document.getElementById("btn-close-stage");
			if (closeBtn) {
				closeBtn.onclick = () => {
					if (this.activeGameInstance && typeof this.activeGameInstance.cleanup === "function") {
						this.activeGameInstance.cleanup();
						this.activeGameInstance = null;
					}
					stageWrap.style.display = "none";
				};
			}

			const baseGameCfg = (this.config.games && this.config.games[gameDef.id]) || {};
			const runtimeCfg = Object.assign({}, baseGameCfg, (this.activeChallenge && this.activeChallenge.customConfig) || {});

			this.activeGameInstance = gameDef.mount(
				stageBody,
				runtimeCfg,
				difficulty,
				(winStats) => this._handleStageWin(winStats, difficulty),
				(loseInfo) => this._handleStageLose(loseInfo, difficulty),
				this.config
			);

			stageWrap.scrollIntoView({ behavior: "smooth", block: "start" });
		},

		_handleStageWin(winStats, difficulty = 2) {
			if (this.activeGameInstance && typeof this.activeGameInstance.cleanup === "function") {
				this.activeGameInstance.cleanup();
				this.activeGameInstance = null;
			}

			if (this.gauntletIndex + 1 < this.gauntletQueue.length && !(winStats && winStats.adminBypass)) {
				this.gauntletIndex++;
				this._mountCurrentStage(difficulty);
				return;
			}

			const stageResult = document.getElementById("stage-result-overlay");
			if (!stageResult) return;
			stageResult.style.display = "flex";

			if (this.activeChallenge) {
				const ch = this.activeChallenge;
				const secretCode = ch.password || "0000";
				const lockLabel = ch.lockLabel || "Padlock";

				// Salva lo stato sbloccato nella sessione corrente e aggiorna la lista multi-lucchetto
				const solveKey = ch.cid || ch.rawTicket;
				if (solveKey) {
					this.solvedMap[solveKey] = secretCode;
					try {
						sessionStorage.setItem(STORAGE_KEYS.SOLVED_LOCKS, JSON.stringify(this.solvedMap));
					} catch (_) {}
				}
				if (this.currentMatchedList && this.currentMatchedList.length > 0) {
					this.renderVictimLocksSelector(this.currentQueryId, this.currentMatchedList);
				}

				BC_GAMES_LOGGER.log("CHALLENGE", "Challenge WON — Password revealed to player", {
					victim: ch.victim || "(anonymous)",
					lockLabel,
					revealedPassword: secretCode
				});

				stageResult.innerHTML = `
					<div class="res-box res-win">
						<div class="res-icon">🔓✨</div>
						<h3>Lock Unlocked: ${this._escapeHtml(lockLabel)}</h3>
						<div class="revealed-code-box">
							<div class="rc-label">Padlock Code / Password for Bondage Club</div>
							<div class="rc-value" id="revealed-secret-val">${this._escapeHtml(secretCode)}</div>
							<button type="button" class="btn btn-primary" id="btn-copy-revealed">📋 Copy Code</button>
						</div>
						<div class="res-actions">
							<button type="button" class="btn" id="btn-replay-stage">🔄 Play Again</button>
						</div>
					</div>
				`;

				const copyBtn = stageResult.querySelector("#btn-copy-revealed");
				if (copyBtn) {
					copyBtn.addEventListener("click", () => {
						navigator.clipboard.writeText(secretCode).then(() => {
							copyBtn.textContent = "✅ Code Copied!";
							setTimeout(() => (copyBtn.textContent = "📋 Copy Code"), 2000);
						});
					});
				}
			} else {
				stageResult.innerHTML = `
					<div class="res-box res-win">
						<div class="res-icon">🏆🎉</div>
						<h3>You Won!</h3>
						<p>Great job in Free Play mode.</p>
						<div class="res-actions">
							<button type="button" class="btn btn-primary" id="btn-replay-stage">🔄 Play Again</button>
						</div>
					</div>
				`;
			}

			const replayBtn = stageResult.querySelector("#btn-replay-stage");
			if (replayBtn) {
				replayBtn.addEventListener("click", () => {
					this.gauntletIndex = 0;
					this._mountCurrentStage(difficulty);
				});
			}
		},

		_handleStageLose(loseInfo, difficulty = 2) {
			if (this.activeGameInstance && typeof this.activeGameInstance.cleanup === "function") {
				this.activeGameInstance.cleanup();
				this.activeGameInstance = null;
			}
			const stageResult = document.getElementById("stage-result-overlay");
			if (!stageResult) return;
			stageResult.style.display = "flex";

			const reason = (loseInfo && loseInfo.reason) || "You failed to unlock the mechanism!";
			stageResult.innerHTML = `
				<div class="res-box res-lose">
					<div class="res-icon">🔒💥</div>
					<h3>Unlock Attempt Failed!</h3>
					<p>${this._escapeHtml(reason)}</p>
					<div class="res-actions">
						<button type="button" class="btn btn-primary" id="btn-retry-stage">🔄 Try Again</button>
					</div>
				</div>
			`;

			const retryBtn = stageResult.querySelector("#btn-retry-stage");
			if (retryBtn) {
				retryBtn.addEventListener("click", () => {
					this._mountCurrentStage(difficulty);
				});
			}
		},

		/* ---------------------------------------------------------------------
		 * CREATE LOCK CHALLENGE (MULTI-LOCK SUPPORT PER PLAYER ID)
		 * --------------------------------------------------------------------- */
		initLockmasterForm() {
			const victimInputEl = document.getElementById("lm-victim-name");
			const lockLabelInputEl = document.getElementById("lm-dom-note");
			const codeInputEl = document.getElementById("lm-secret-code");
			const rand4Btn = document.getElementById("lm-btn-rand-4");
			const randWordBtn = document.getElementById("lm-btn-rand-word");
			const gameSelectEl = document.getElementById("lm-game-select");
			const diffSelectEl = document.getElementById("lm-diff-select");
			const generateBtn = document.getElementById("lm-btn-generate");
			const outputBox = document.getElementById("lm-output-box");

			if (!generateBtn) return;

			if (rand4Btn) {
				rand4Btn.addEventListener("click", () => {
					codeInputEl.value = String(Math.floor(1000 + Math.random() * 9000));
					BC_SOUND_FX.click();
				});
			}
			if (randWordBtn) {
				randWordBtn.addEventListener("click", () => {
					const words = ["LATEX", "BOUND", "COLLAR", "LOCKED", "DOLL", "KNEEL", "SUBBY", "CUFFED"];
					const w = words[Math.floor(Math.random() * words.length)];
					const num = Math.floor(10 + Math.random() * 89);
					codeInputEl.value = (w + num).slice(0, 8);
					BC_SOUND_FX.click();
				});
			}

			generateBtn.addEventListener("click", () => {
				let victimKey = victimInputEl ? victimInputEl.value.trim() : "";
				let password = String(codeInputEl.value || "").trim().toUpperCase();

				if (!victimKey) {
					victimKey = String(Math.floor(100000 + Math.random() * 900000));
					if (victimInputEl) victimInputEl.value = victimKey;
				}

				if (!password) {
					password = String(Math.floor(1000 + Math.random() * 9000));
					codeInputEl.value = password;
				}

				const vKeyLow = victimKey.toLowerCase();
				this.config.victimChallenges = this.config.victimChallenges || {};
				const existingList = this._normalizeChallengeList(this.config.victimChallenges[vKeyLow], victimKey);

				const nextNum = existingList.length + 1;
				let lockLabel = lockLabelInputEl ? lockLabelInputEl.value.trim() : "";
				if (!lockLabel) {
					lockLabel = `Lock #${nextNum}`;
				}

				const lockType = /^\d{4}$/.test(password) ? "comb" : "pass";
				const cid = `L${Date.now().toString(36).slice(-4).toUpperCase()}`;

				const payload = {
					cid,
					password,
					lockType,
					gameId: gameSelectEl.value || "crack",
					difficulty: Number(diffSelectEl.value || 2),
					victim: victimKey,
					lockLabel
				};

				const { token, ticket } = BC_CRYPTO_CODEC.encodeChallenge(payload);
				const baseUrl = window.location.origin + window.location.pathname;
				const fullUrl = `${baseUrl}?c=${token}`;

				// Aggiunge il nuovo lucchetto alla lista del Player ID (senza sovrascrivere i precedenti!)
				existingList.push({
					cid,
					playerId: victimKey,
					lockLabel,
					gameId: payload.gameId,
					difficulty: payload.difficulty,
					ticket,
					createdAt: new Date().toISOString()
				});
				this.config.victimChallenges[vKeyLow] = existingList;

				this.saveLocalConfig(true);

				this.addToPasswordVault({
					cid,
					createdAt: new Date().toISOString(),
					victim: victimKey,
					lockLabel,
					lockType: payload.lockType,
					password: payload.password,
					gameId: payload.gameId,
					difficulty: payload.difficulty,
					ticket,
					fullUrl
				});

				outputBox.style.display = "block";
				document.getElementById("lm-out-victim-key").textContent = `${victimKey} (${lockLabel})`;
				document.getElementById("lm-out-password").textContent = payload.password;
				document.getElementById("lm-out-url").value = fullUrl;

				const testBtn = document.getElementById("lm-btn-test-now");
				if (testBtn) {
					testBtn.onclick = () => {
						const inp = document.getElementById("victim-lookup-input");
						if (inp) inp.value = victimKey;
						this.lookupChallengeByInput(victimKey);
					};
				}

				if (lockLabelInputEl) lockLabelInputEl.value = "";
				this.renderDomActiveChallenges();
				BC_SOUND_FX.unlockSuccess();
			});

			const copyUrlBtn = document.getElementById("lm-copy-url");
			if (copyUrlBtn) {
				copyUrlBtn.addEventListener("click", () => {
					const val = document.getElementById("lm-out-url").value;
					navigator.clipboard.writeText(val).then(() => {
						copyUrlBtn.textContent = "✅ Link Copied!";
						setTimeout(() => (copyUrlBtn.textContent = "📋 Copy Direct Link"), 2000);
					});
				});
			}

			this.renderDomActiveChallenges();
		},

		renderDomActiveChallenges() {
			const tbody = document.getElementById("lm-active-list-body");
			if (!tbody) return;
			const map = (this.config && this.config.victimChallenges) || {};
			const allRows = [];

			for (const [key, listOrObj] of Object.entries(map)) {
				const list = this._normalizeChallengeList(listOrObj, key);
				list.forEach((item) => {
					allRows.push({ key, item });
				});
			}

			if (allRows.length === 0) {
				tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);">No active lock challenges yet. Fill in the fields above and click "✅ Activate Challenge".</td></tr>`;
				return;
			}

			tbody.innerHTML = "";
			allRows.forEach(({ key, item }) => {
				const decoded = BC_CRYPTO_CODEC.decodeChallenge(item.ticket, true);
				const pass = decoded ? decoded.password : "???";
				const token = item.ticket.replace(/^BC-/i, "");
				const baseUrl = window.location.origin + window.location.pathname;
				const fullUrl = `${baseUrl}?c=${token}`;

				const tr = document.createElement("tr");
				tr.innerHTML = `
					<td><strong>${this._escapeHtml(item.playerId || key)}</strong></td>
					<td><span class="badge">🔒 ${this._escapeHtml(item.lockLabel)}</span></td>
					<td><span class="adm-highlight-code">${this._escapeHtml(pass)}</span></td>
					<td>${this._escapeHtml(item.gameId)}</td>
					<td style="display:flex; gap:6px; flex-wrap:wrap;">
						<button type="button" class="btn btn-primary btn-sm" data-play-cid="${this._escapeHtml(item.cid)}">▶ Test</button>
						<button type="button" class="btn btn-sm" data-copy-link="${this._escapeHtml(fullUrl)}">📋 Link</button>
						<button type="button" class="btn btn-sm" data-del-cid="${this._escapeHtml(item.cid)}">🗑️</button>
					</td>
				`;
				tr.querySelector("[data-play-cid]").addEventListener("click", () => {
					const inp = document.getElementById("victim-lookup-input");
					if (inp) inp.value = item.playerId || key;
					this.lookupChallengeByInput(item.playerId || key);
				});
				const copyBtn = tr.querySelector("[data-copy-link]");
				copyBtn.addEventListener("click", () => {
					navigator.clipboard.writeText(fullUrl).then(() => {
						copyBtn.textContent = "✅";
						setTimeout(() => (copyBtn.textContent = "📋 Link"), 1500);
					});
				});
				tr.querySelector("[data-del-cid]").addEventListener("click", () => {
					const currentList = this._normalizeChallengeList(this.config.victimChallenges[key], key);
					const filtered = currentList.filter((x) => x.cid !== item.cid);
					if (filtered.length === 0) {
						delete this.config.victimChallenges[key];
					} else {
						this.config.victimChallenges[key] = filtered;
					}
					this.saveLocalConfig(true);
					this.renderDomActiveChallenges();
				});
				tbody.appendChild(tr);
			});
		},

		addToPasswordVault(entry) {
			try {
				const raw = localStorage.getItem(STORAGE_KEYS.VAULT);
				const list = raw ? JSON.parse(raw) : [];
				list.unshift(entry);
				localStorage.setItem(STORAGE_KEYS.VAULT, JSON.stringify(list.slice(0, 100)));
			} catch (_) {}
		},

		getPasswordVault() {
			try {
				const raw = localStorage.getItem(STORAGE_KEYS.VAULT);
				return raw ? JSON.parse(raw) : [];
			} catch (_) {
				return [];
			}
		},

		/* ---------------------------------------------------------------------
		 * PROTECTED ADMIN PANEL
		 * --------------------------------------------------------------------- */
		initAdminPanel() {
			const loginBtn = document.getElementById("adm-login-btn");
			const passInput = document.getElementById("adm-pass-input");
			const logoutBtn = document.getElementById("adm-logout-btn");

			if (loginBtn && passInput) {
				const attemptLogin = async () => {
					const val = passInput.value.trim();
					if (!val) return;
					const hash = await BC_CRYPTO_CODEC.sha256Hex(val);

					if (hash === DEFAULT_ADMIN_HASH) {
						this.isAdmin = true;
						try {
							sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, "true");
						} catch (_) {}

						const unlockedToken = await BC_CRYPTO_CODEC.unlockGitHubTokenWithPassword(val);
						if (unlockedToken) {
							try {
								localStorage.setItem(STORAGE_KEYS.GH_TOKEN, unlockedToken);
							} catch (_) {}
							BC_GAMES_LOGGER.log("ADMIN", "Admin authenticated & Cloud GitHub Sync unlocked automatically");
							this.syncConfigToGitHub(true);
							this.pushLogsToGitHub(true);
						} else {
							BC_GAMES_LOGGER.log("ADMIN", "Admin authenticated successfully");
						}

						passInput.value = "";
						BC_SOUND_FX.unlockSuccess();
						this.renderAdminView();
					} else {
						BC_SOUND_FX.errorBuzz();
						BC_GAMES_LOGGER.log("WARN", "Failed admin login attempt");
						const errEl = document.getElementById("adm-login-error");
						if (errEl) errEl.style.display = "block";
					}
				};
				loginBtn.addEventListener("click", attemptLogin);
				passInput.addEventListener("keydown", (e) => {
					if (e.key === "Enter") attemptLogin();
				});
			}

			if (logoutBtn) {
				logoutBtn.addEventListener("click", () => {
					this.isAdmin = false;
					try {
						sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
					} catch (_) {}
					BC_GAMES_LOGGER.log("ADMIN", "Admin logged out");
					this.renderAdminView();
				});
			}

			const decBtn = document.getElementById("adm-btn-decrypt");
			if (decBtn) {
				decBtn.addEventListener("click", () => {
					const inp = document.getElementById("adm-decrypt-input").value.trim();
					const resBox = document.getElementById("adm-decrypt-result");

					const decodedSingle = BC_CRYPTO_CODEC.decodeChallenge(inp, true);
					if (decodedSingle) {
						resBox.style.display = "block";
						resBox.innerHTML = `
							<div><strong>🔑 PADLOCK CODE:</strong> <span class="adm-highlight-code">${this._escapeHtml(decodedSingle.password)}</span></div>
							<div><strong>👤 Player ID:</strong> ${this._escapeHtml(decodedSingle.victim || "(Any)")} — <strong>Lock:</strong> ${this._escapeHtml(decodedSingle.lockLabel || "Default")}</div>
						`;
						return;
					}

					const list = this._normalizeChallengeList(
						this.config.victimChallenges && this.config.victimChallenges[inp.toLowerCase()],
						inp
					);
					if (list.length > 0) {
						resBox.style.display = "block";
						resBox.innerHTML = list
							.map((item) => {
								const d = BC_CRYPTO_CODEC.decodeChallenge(item.ticket, true);
								return `<div style="margin-bottom:6px;">🔒 <strong>${this._escapeHtml(item.lockLabel)}</strong> → Code: <span class="adm-highlight-code">${this._escapeHtml(d ? d.password : "???")}</span> (${this._escapeHtml(item.gameId)})</div>`;
							})
							.join("");
						return;
					}

					resBox.style.display = "block";
					resBox.innerHTML = `<span style="color:var(--danger)">❌ No password found for this link or Player ID.</span>`;
				});
			}

			const copyLogBtn = document.getElementById("adm-copy-log");
			if (copyLogBtn) {
				copyLogBtn.addEventListener("click", () => {
					navigator.clipboard.writeText(BC_GAMES_LOGGER.formatAsText()).then(() => {
						copyLogBtn.textContent = "✅ Log Copied!";
						setTimeout(() => (copyLogBtn.textContent = "📋 Copy Log"), 2000);
					});
				});
			}
			const syncLogBtn = document.getElementById("adm-sync-log-gh");
			if (syncLogBtn) {
				syncLogBtn.addEventListener("click", () => this.pushLogsToGitHub(false));
			}
			const clearLogBtn = document.getElementById("adm-clear-log");
			if (clearLogBtn) {
				clearLogBtn.addEventListener("click", () => {
					BC_GAMES_LOGGER.clear();
					this.renderAdminLogs();
				});
			}

			const syncGhBtn = document.getElementById("adm-sync-github-btn");
			if (syncGhBtn) {
				syncGhBtn.addEventListener("click", () => this.syncConfigToGitHub(false));
			}

			BC_GAMES_LOGGER.onUpdate = () => {
				if (this.isAdmin) this.renderAdminLogs();
			};
		},

		renderAdminView() {
			const loginGate = document.getElementById("adm-login-gate");
			const dashBody = document.getElementById("adm-dashboard-body");
			if (!loginGate || !dashBody) return;

			if (!this.isAdmin) {
				loginGate.style.display = "block";
				dashBody.style.display = "none";
				return;
			}

			loginGate.style.display = "none";
			dashBody.style.display = "block";

			this.renderDomActiveChallenges();
			this.renderAdminGamesConfig();
			this.renderAdminVault();
			this.renderAdminLogs();
		},

		renderAdminGamesConfig() {
			const container = document.getElementById("adm-games-config-list");
			if (!container) return;
			container.innerHTML = "";

			BC_GAMES_REGISTRY.getAll().forEach((g) => {
				const gCfg = (this.config.games && this.config.games[g.id]) || {};
				const isEnabled = gCfg.enabled !== false;

				const box = document.createElement("div");
				box.className = "adm-game-box";

				let fieldsHtml = "";
				const schema = g.configSchema || {};
				for (const [key, def] of Object.entries(schema)) {
					const val = gCfg[key] !== undefined ? gCfg[key] : def.default;
					if (def.type === "boolean") {
						fieldsHtml += `
							<label class="adm-param-row">
								<span>${def.label}</span>
								<input type="checkbox" data-game="${g.id}" data-param="${key}" ${val ? "checked" : ""}>
							</label>
						`;
					} else if (def.type === "select") {
						const opts = (def.options || [])
							.map((o) => `<option value="${o}" ${val === o ? "selected" : ""}>${o}</option>`)
							.join("");
						fieldsHtml += `
							<label class="adm-param-row">
								<span>${def.label}</span>
								<select data-game="${g.id}" data-param="${key}">${opts}</select>
							</label>
						`;
					} else {
						fieldsHtml += `
							<label class="adm-param-row">
								<span>${def.label}</span>
								<input type="number" data-game="${g.id}" data-param="${key}" value="${val}" min="${def.min ?? 0}" max="${def.max ?? 999}" step="${def.step ?? 1}">
							</label>
						`;
					}
				}

				box.innerHTML = `
					<div class="adm-game-head">
						<div class="adm-game-title">${g.icon} <strong>${g.title}</strong> <span class="badge">${g.id}</span></div>
						<label class="adm-switch">
							<input type="checkbox" data-toggle-game="${g.id}" ${isEnabled ? "checked" : ""}>
							<span>${isEnabled ? "🟢 Enabled" : "🔴 Disabled"}</span>
						</label>
					</div>
					<div class="adm-params-grid">${fieldsHtml}</div>
				`;
				container.appendChild(box);
			});

			container.querySelectorAll("[data-toggle-game]").forEach((chk) => {
				chk.addEventListener("change", () => {
					const gid = chk.getAttribute("data-toggle-game");
					this.config.games[gid] = this.config.games[gid] || {};
					this.config.games[gid].enabled = chk.checked;
					this.saveLocalConfig(true);
					this.renderArcadeGrid();
					this.renderAdminGamesConfig();
				});
			});

			container.querySelectorAll("[data-param]").forEach((inp) => {
				inp.addEventListener("change", () => {
					const gid = inp.getAttribute("data-game");
					const param = inp.getAttribute("data-param");
					this.config.games[gid] = this.config.games[gid] || {};
					if (inp.type === "checkbox") {
						this.config.games[gid][param] = inp.checked;
					} else if (inp.type === "number") {
						this.config.games[gid][param] = Number(inp.value);
					} else {
						this.config.games[gid][param] = inp.value;
					}
					this.saveLocalConfig(true);
				});
			});
		},

		renderAdminVault() {
			const tbody = document.getElementById("adm-vault-table-body");
			if (!tbody) return;
			const vault = this.getPasswordVault();
			if (vault.length === 0) {
				tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);">No locks generated yet.</td></tr>`;
				return;
			}

			tbody.innerHTML = "";
			vault.slice(0, 30).forEach((v) => {
				const tr = document.createElement("tr");
				const dateStr = new Date(v.createdAt).toLocaleString();
				tr.innerHTML = `
					<td>${this._escapeHtml(dateStr)}</td>
					<td><strong>${this._escapeHtml(v.victim || "Guest")}</strong> <span class="badge">${this._escapeHtml(v.lockLabel || "Lock")}</span></td>
					<td><span class="adm-highlight-code">${this._escapeHtml(v.password)}</span></td>
					<td>${this._escapeHtml(v.gameId)}</td>
					<td><button type="button" class="btn btn-sm" data-copy-vault="${this._escapeHtml(v.fullUrl)}">🔗 Copy Link</button></td>
				`;
				const btn = tr.querySelector("[data-copy-vault]");
				btn.addEventListener("click", () => {
					navigator.clipboard.writeText(v.fullUrl).then(() => {
						btn.textContent = "✅ Copied!";
						setTimeout(() => (btn.textContent = "🔗 Copy Link"), 1500);
					});
				});
				tbody.appendChild(tr);
			});
		},

		renderAdminLogs() {
			const pre = document.getElementById("adm-diagnostic-log-view");
			if (!pre) return;
			pre.textContent = BC_GAMES_LOGGER.formatAsText();
			pre.scrollTop = pre.scrollHeight;
		},

		async _putGitHubFile(repoPath, contentStr, commitMsg) {
			const token = localStorage.getItem(STORAGE_KEYS.GH_TOKEN);
			if (!token) throw new Error("Log into the Admin Panel once to enable automatic Cloud Sync.");

			const apiUrl = `https://api.github.com/repos/JoJo-BC/JoJo-Mod/contents/${repoPath}`;
			const getRes = await fetch(apiUrl, {
				headers: {
					Accept: "application/vnd.github+json",
					Authorization: `Bearer ${token}`
				}
			});

			let existingSha = null;
			if (getRes.ok) {
				const existingData = await getRes.json();
				existingSha = existingData.sha;
			}

			const b64Content = btoa(unescape(encodeURIComponent(contentStr)));
			const putBody = {
				message: commitMsg,
				content: b64Content,
				branch: "main"
			};
			if (existingSha) putBody.sha = existingSha;

			const putRes = await fetch(apiUrl, {
				method: "PUT",
				headers: {
					Accept: "application/vnd.github+json",
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify(putBody)
			});

			if (!putRes.ok) {
				const errTxt = await putRes.text();
				throw new Error(`HTTP ${putRes.status}: ${errTxt}`);
			}
		},

		async syncConfigToGitHub(silent = false) {
			const statusEl = document.getElementById("adm-gh-sync-status");
			if (!silent && statusEl) {
				statusEl.textContent = "⏳ Saving to GitHub Pages...";
				statusEl.style.color = "var(--info)";
			}

			try {
				await this._putGitHubFile(
					"games/games-config.json",
					JSON.stringify(this.config, null, 2),
					"Auto-sync games-config.json from BC Arcade"
				);
				if (!silent && statusEl) {
					statusEl.textContent = "✅ Challenges and settings synced to GitHub Pages!";
					statusEl.style.color = "var(--success)";
				}
			} catch (err) {
				if (!silent && statusEl) {
					statusEl.textContent = `❌ ${err.message}`;
					statusEl.style.color = "var(--danger)";
				}
			}
		},

		async pushLogsToGitHub(silent = false) {
			const token = localStorage.getItem(STORAGE_KEYS.GH_TOKEN);
			if (!token) return;
			const btn = document.getElementById("adm-sync-log-gh");
			if (!silent && btn) btn.textContent = "⏳ Uploading Log...";

			try {
				await this._putGitHubFile(
					"games/diagnostic-log.txt",
					BC_GAMES_LOGGER.formatAsText(),
					"Auto-sync diagnostic-log.txt from BC Arcade"
				);
				if (!silent && btn) {
					btn.textContent = "✅ Log Synced to Cloud!";
					setTimeout(() => (btn.textContent = "☁️ Sync Log to Cloud"), 2500);
				}
			} catch (_) {
				if (!silent && btn) btn.textContent = "❌ Sync Failed";
			}
		},

		_escapeHtml(str) {
			return String(str || "")
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;");
		}
	};

	window.BC_GAMES_REGISTRY = BC_GAMES_REGISTRY;
	window.BC_CRYPTO_CODEC = BC_CRYPTO_CODEC;
	window.BC_GAMES_LOGGER = BC_GAMES_LOGGER;
	window.BC_APP_CONTROLLER = BC_APP_CONTROLLER;

	document.addEventListener("DOMContentLoaded", () => {
		BC_APP_CONTROLLER.init();
	});
})();
