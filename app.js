
const PEOPLE = window.PETRA_PEOPLE;
const QUESTIONS = window.PETRA_QUESTIONS;
const $ = id => document.getElementById(id);

let player = "", current = 0;
let answers = Array(QUESTIONS.length).fill("");
let petraClient = null, submissions = [];
let shuffledPeople = [];
let shuffledQuestions = [];

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo(0, 0);
}

function isConfigured() {
  const c = window.PETRA_CONFIG || {};
  return typeof c.SUPABASE_URL === "string" && c.SUPABASE_URL.startsWith("https://")
    && typeof c.SUPABASE_ANON_KEY === "string" && c.SUPABASE_ANON_KEY.length > 20
    && !c.SUPABASE_ANON_KEY.includes("PEGA_AQUI");
}

function isDemo() {
  return !window.PETRA_CONFIG || window.PETRA_CONFIG.DEMO_MODE !== false;
}

if (!isDemo() && isConfigured() && window.supabase && window.supabase.createClient) {
  petraClient = window.supabase.createClient(
    window.PETRA_CONFIG.SUPABASE_URL,
    window.PETRA_CONFIG.SUPABASE_ANON_KEY
  );
}

$("startBtn").onclick = () => show("nameScreen");

$("beginQuiz").onclick = () => {
  const n = $("playerName").value.trim();
  if (!n) {
    $("playerName").focus();
    return;
  }

  player = n;
  current = 0;
  answers = Array(QUESTIONS.length).fill("");

  // Mezclar los nombres y las preguntas para esta partida
  shuffledPeople = shuffle(PEOPLE);
  shuffledQuestions = shuffle(
    QUESTIONS.map((q, index) => ({ ...q, originalIndex: index }))
  );

  // Mostrar las normas antes de empezar las preguntas
  show("rulesScreen");
};

$("playerName").addEventListener("keydown", e => {
  if (e.key === "Enter") $("beginQuiz").click();
});

// Al aceptar las normas, comienza el cuestionario
$("continueToQuiz").onclick = () => {
  renderQuestion();
  show("quizScreen");
};

function renderQuestion() {
  const q = shuffledQuestions[current];

  $("qNumber").textContent = String(current + 1).padStart(2, "0");
  $("progressText").textContent =
    `${String(current + 1).padStart(2, "0")} / ${QUESTIONS.length}`;

  $("progressBar").style.width =
    `${(current + 1) / QUESTIONS.length * 100}%`;

  $("questionText").textContent = q.text;
  $("choices").innerHTML = "";

  const select = document.createElement("select");
  select.id = "answerSelect";
  select.innerHTML = '<option value="">— Elige una persona —</option>';

  shuffledPeople.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });

  // Guardar cada respuesta en su pregunta original
  select.value = answers[q.originalIndex] || "";
  select.onchange = () => {
    answers[q.originalIndex] = select.value;
  };

  $("choices").appendChild(select);

  $("backBtn").disabled = current === 0;

  $("nextBtn").textContent = current === QUESTIONS.length - 1
    ? "ENVIAR RESPUESTAS ✓"
    : "SIGUIENTE →";
}

$("backBtn").onclick = () => {
  if (current > 0) {
    current--;
    renderQuestion();
  }
};

$("nextBtn").onclick = async () => {
  const originalIndex = shuffledQuestions[current].originalIndex;

  if (!answers[originalIndex]) {
    alert("Elige una persona antes de continuar.");
    return;
  }

  if (current < QUESTIONS.length - 1) {
    current++;
    renderQuestion();
    return;
  }

  await submitAnswers();
};

async function submitAnswers() {
  const score = answers.reduce((n, a, i) =>
    n + (a === QUESTIONS[i].answer ? 1 : 0), 0);

  try {
    if (petraClient) {
      const { error } = await petraClient
        .from("petra_submissions")
        .insert({
          player_name: player,
          answers,
          score
        });

      if (error) throw error;

    } else {
      const all = JSON.parse(
        localStorage.getItem("petra_demo_submissions") || "[]"
      );

      all.push({
        player_name: player,
        answers: [...answers],
        score,
        created_at: new Date().toISOString()
      });

      localStorage.setItem(
        "petra_demo_submissions",
        JSON.stringify(all)
      );
    }

    $("saveMessage").textContent =
      `¡Respuestas guardadas! Gracias, ${player}.`;

    show("doneScreen");

  } catch (e) {
    $("saveMessage").textContent =
      "No se han podido guardar las respuestas: " + e.message;

    show("doneScreen");
  }
}

$("homeBtn").onclick = () => {
  $("playerName").value = "";
  show("home");
};

$("adminLink").onclick = e => {
  e.preventDefault();
  show("adminScreen");
};

$("loginBtn").onclick = async () => {
  $("loginError").textContent = "";

  if (!petraClient) {
    $("loginError").textContent =
      "La administración compartida requiere conectar Supabase y poner DEMO_MODE: false en config.js.";
    return;
  }

  const { data, error } = await petraClient.auth.signInWithPassword({
    email: $("adminEmail").value,
    password: $("adminPassword").value
  });

  if (error) {
    $("loginError").textContent = error.message;
    return;
  }

  await loadResults();
};

async function loadResults() {
  if (petraClient) {
    const { data, error } = await petraClient
      .from("petra_submissions")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      $("loginError").textContent = error.message;
      return;
    }

    submissions = data || [];

  } else {
    submissions = JSON.parse(
      localStorage.getItem("petra_demo_submissions") || "[]"
    );
  }

  renderResults();
}

$("refreshBtn").onclick = loadResults;

function renderResults() {
  $("adminLogin").hidden = true;
  $("adminResults").hidden = false;

  const sorted = [...submissions].sort((a, b) => b.score - a.score);

  $("countLabel").textContent =
    `${sorted.length} participante${sorted.length === 1 ? "" : "s"}`;

  $("leaderboard").innerHTML = "";
  $("answerDetails").innerHTML = "";

  if (!sorted.length) {
    $("leaderboard").innerHTML =
      '<p class="muted">Todavía no hay respuestas.</p>';
    return;
  }

  const max = sorted[0].score;
  const winners = sorted
    .filter(r => r.score === max)
    .map(r => r.player_name);

  const win = document.createElement("div");
  win.className = "winnerbox";
  win.textContent =
    `🏆 ${max}/${QUESTIONS.length} · ${
      winners.length > 1 ? "EMPATE: " : "GANADOR/A: "
    }${winners.join(", ")}`;

  $("leaderboard").appendChild(win);

  sorted.forEach((r, i) => {
    const row = document.createElement("div");
    row.className = "rank";

    const rank = document.createElement("span");
    rank.className = "rankno";
    rank.textContent = i === 0 ? "🏆" : `${i + 1}º`;

    const name = document.createElement("strong");
    name.textContent = r.player_name;

    const points = document.createElement("span");
    points.className = "points";
    points.textContent = `${r.score}/${QUESTIONS.length}`;

    row.append(rank, name, points);

    if (r.score === max) row.classList.add("winner");

    $("leaderboard").appendChild(row);

    const details = document.createElement("details");
    details.className = "submission";

    const summary = document.createElement("summary");
    summary.textContent =
      `${r.player_name} · ${r.score}/${QUESTIONS.length}`;

    const list = document.createElement("ol");

    // Mostrar las respuestas en el orden original de las curiosidades
    QUESTIONS.forEach((q, qi) => {
      const li = document.createElement("li");
      const correct = (r.answers || [])[qi] === q.answer;

      li.textContent =
        `${q.text} — ${r.answers?.[qi] || "Sin respuesta"} ${
          correct ? "✓" : `(correcta: ${q.answer})`
        }`;

      list.appendChild(li);
    });

    details.append(summary, list);
    $("answerDetails").appendChild(details);
  });
}

$("exportBtn").onclick = () => {
  const rows = [
    [
      "Participante",
      "Aciertos",
      ...QUESTIONS.map((q, i) =>
        `Curiosidad ${i + 1}: ${q.text}`)
    ],
    ...submissions.map(r => [
      r.player_name,
      r.score,
      ...(r.answers || [])
    ])
  ];

  const csv = rows.map(row =>
    row.map(v =>
      '"' + String(v ?? "").replaceAll('"', '""') + '"'
    ).join(";")
  ).join("\n");

  const blob = new Blob(["\ufeff" + csv], {
    type: "text/csv;charset=utf-8"
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "petra-resultados.csv";
  a.click();

  URL.revokeObjectURL(a.href);
};

if (isDemo()) {
  $("adminLogin").innerHTML =
    '<p class="small">Modo demostración: las respuestas solo se guardan en este navegador. Para que Laura vea las respuestas de todos, conecta Supabase siguiendo el archivo LEEME.</p>';

  const demoBtn = document.createElement("button");
  demoBtn.className = "primary";
  demoBtn.textContent = "VER MARCADOR DE PRUEBA";
  demoBtn.onclick = loadResults;

  $("adminLogin").before(demoBtn);
}
