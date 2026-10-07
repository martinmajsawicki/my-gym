// ==== ADAPTER START: ChatGPT Sites ====
// Adapter przeglądarkowy dla wariantu ChatGPT Sites. build.mjs wkleja ten blok do my-gym.html w miejsce adaptera Claude
// i zapisuje wynik jako sites/public/index.html oraz sites/src/page.ts. Kontrakt adaptera opisuje AGENTS.md.
// Strona rozmawia z backendem (sites/src/index.ts) pod tym samym originem: GET /api/plan, GET /api/workouts,
// PUT /api/workouts/{id}, GET /api/targets. Tożsamość użytkownika ustala platforma Sites, nie strona.
var ADAPTER = {
  assistantName: { nom: "ChatGPT", gen: "ChatGPT", dat: "ChatGPT" },
  localNote: "Strona nie połączyła się ze swoją bazą. Odśwież ją; jeśli to się powtarza, sprawdź, czy jesteś zalogowany w ChatGPT.",
  connect: function(){
    var api = function(method, path, body){
      var opts = { method: method, credentials: "same-origin", cache: "no-store", headers: { "Accept": "application/json", "X-Requested-With": "my-gym" } };
      if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
      return fetch(path, opts).then(function(res){
        return res.text().then(function(txt){
          var j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) {}
          if (!res.ok) { var err = new Error((j && j.error) || ("HTTP " + res.status)); err.status = res.status; throw err; }
          return j;
        });
      });
    };
    return api("GET", "/api/plan").then(function(j){
      var planDoc = j && j.plan ? j.plan : null;
      return {
        loadPlan: function(){ return Promise.resolve(planDoc); },
        listSessions: function(limit){ return api("GET", "/api/workouts?limit=" + encodeURIComponent(limit)).then(function(j){ return (j && j.workouts) || []; }); },
        saveSession: function(s){ return api("PUT", "/api/workouts/" + encodeURIComponent(s.id), s).then(function(){}); },
        loadTargets: function(){ return api("GET", "/api/targets").then(function(j){ return (j && j.targets) || {}; }); }
      };
    }, function(){ return null; });   // 401 albo brak backendu: strona działa bez magazynu i mówi o tym w pasku statusu
  },
  assistant: function(){ return Promise.resolve(null); }   // bez modelu w stronie; rozmowa o planie idzie przez narzędzia MCP w ChatGPT
};
// ==== ADAPTER END ====
