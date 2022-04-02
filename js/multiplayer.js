//import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Para facilitar o debug
const debugMode = false;
const infoMode = false;

//var canvas = document.getElementById('tela');
//var heightRatio = 0.5;
//canvas.height = canvas.width * heightRatio;

// Informações para acessar os bancos de dados do SUPABASE
const SUPABASE_URL = "https://plnapxphvollprupnias.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbmFweHBodm9sbHBydXBuaWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDU0NDg5NjgsImV4cCI6MTk2MTAyNDk2OH0.S84tT1utiTDPyP1paIT8x4WumfKvbwVAyhZX1TzAZ7s";
const SUPABASE_PLAYER_TABLES = ["TAB1", "TAB2", "TAB3", "TAB4", "TAB5"];
const SUPABASE_ENEMY_TABLES = ["BAD1", "BAD2", "BAD3", "BAD4", "BAD5"];
const SUPABASE_INFO_TABLE = ["GAME_INFO"];

// Informações das salas para exibição (número e jogador que iniciou jogo)
let NUM_PLAYERS_IN_ROOMS = [];
let BOSS_IN_ROOMS = [];
for (var i = 0; i < SUPABASE_PLAYER_TABLES.length; i++) {
  NUM_PLAYERS_IN_ROOMS.push(0);
  BOSS_IN_ROOMS.push(null);
}

var APAGOU_TUDO = false;

// Variáveis específicas do atual cliente
let CURRENT_PLAYER_ID = null;
let CURRENT_PLAYER_ROOM = null;
let CURRENT_ROOM_ENEMIES = [];
let CURRENT_ROOM_NAMES = {};
let CURRENT_ROOM_POINTS = {};

// Variáveis de configuração
const SCREEN_WIDTH = 30;
const SCREEN_HEIGHT = 30;
const TAXA_INIMIGOS = 2000;

/////////////////////////////////////////////////////////////////////////////////////

// Consulta informações na tabela do SUPABASE (sem índice)
async function consultaInfoSemIndice(tableName) {
  const { data, error } = await _supa.from(tableName)
    .select('*')
  
  if (error) {console.log("ERRO (SELECT 1): ");console.log(error);console.log(tableName);} 
  if (debugMode) {console.log("ALL DATA (1): ", data);}
  
  return data;
}

// Consulta informações na tabela do SUPABASE (com índice)
async function consultaInfoComIndice(tableName, indice) {
  const { data, error } = await _supa.from(tableName)
    .select('*')
  
  if (error) {console.log("ERRO (SELECT 2): ");console.log(error);console.log(tableName);} 
  if (debugMode) {console.log("ALL DATA (2): ", data);}
  
  return {data, indice};
}

// Insere linha na tabela do SUPABASE
async function adicionaInfoNoBancoDeDados(tableName, tableInfo) {
  const { data, error } = await _supa.from(tableName)
    .insert([tableInfo])
  
  if (error) {console.log("ERRO (INSERT): ");console.log(error);console.log(tableName);} 
  if (debugMode) {console.log("NEW DATA: ", data);}
  
  return data;
}

// Atualiza linha na tabela do SUPABASE
async function atualizaInfoNoBancoDeDados(tableName, tableInfo, tableId) {
  const { data, error } = await _supa.from(tableName)
    .update([tableInfo])
    .eq('id', tableId) 
    .single()
    
  if (error) {console.log("ERRO (UPDATE): ");console.log(error);console.log(tableName);console.log(tableInfo);console.log(tableId);} 
  if (debugMode) {console.log("UPDATED DATA: ", data);}
  
  return data;
}

// Remove linha na tabela do SUPABASE
async function removeInfoNoBancoDeDados(tableName, tableId) {
  const { data, error } = await _supa.from(tableName)
    .delete()
    .eq('id', tableId) 

  if (error) {console.log("ERRO (DELETE): ");console.log(error);console.log(tableId);console.log(tableName);} 
  if (debugMode) {console.log("DELETED DATA: ", data);}
  
  return data;
}

// Atualiza linha na tabela do SUPABASE
async function atualizaGameInfoNoBancoDeDados(gameInfo, roomIndex) {
  const { data, error } = await _supa.from(SUPABASE_INFO_TABLE)
    .update([gameInfo])
    .eq('INDEX', roomIndex) 
    .single()
    
  if (error) {console.log("ERRO (GAME UPDATE): ");console.log(error);console.log(gameInfo);console.log(roomIndex);} 
  if (debugMode) {console.log("UPDATED GAME DATA: ", data);}
  
  return data;
}

/////////////////////////////////////////////////////////////////////////////////////

// Inicializa instâcia do objeto do jogo (em cada cliente executado)
var GAME = createGame();

// Inicializa cliente do Supabase (banco de dados atua como servidor)
//const _supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const _supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Inicializa as informações na criação da sessão
consultaInfoSemIndice(SUPABASE_INFO_TABLE).then((gameInfo) => {
  
  // Exibe a tela inicial com informações das salas
  inicializaTela(gameInfo);

  // Monitora as tabelas do SUPABASE
  monitoraSupabase().then(() => {});

  // Monitora o botão da sala e as teclas pressionadas pelo jogador
  monitoraTela();

});

/////////////////////////////////////////////////////////////////////////////////////

// Exibe pontuação dos jogadores que já estão na sala
function exibePontuacao() {
  
  var emptyNames = false;
  var emptyPoints = false;
  
  if (Object.keys(CURRENT_ROOM_NAMES).length === 0) {
    emptyNames = true;
  }
  
  if (Object.keys(CURRENT_ROOM_POINTS).length === 0) {
    emptyPoints = true;
  }
  
  if (emptyNames && emptyPoints) {
    // só pra mostrar que não tem jogadores
    //document.getElementById('pontos').innerHTML = "<BR><BR>&nbsp&nbspVAZIO"; 
    document.getElementById('pontos').innerHTML = ""; 
  } else {
    var infoText = "<br><table>";
    infoText += "<tr><th>JOGADOR</th><th>PONTOS</th></tr>";
    
    for (const playerID in CURRENT_ROOM_NAMES) {
      infoText += "<tr><td>" + CURRENT_ROOM_NAMES[playerID] +"</td><td>" + CURRENT_ROOM_POINTS[playerID] + "</td></tr>";   
    }
  
    infoText += "</table>";
    document.getElementById('pontos').innerHTML = infoText; 
  }
  
  if (debugMode) {
    console.log(CURRENT_ROOM_NAMES);
    console.log(CURRENT_ROOM_POINTS);
  }
  
}

// Inicialização das telas com as informações iniciais
function inicializaTela(gameInfo) {
  
  // Exibe o canvas com dimensões ajustadas
  document.getElementById('tela').innerHTML = "<canvas id='screen' width='" + SCREEN_WIDTH + "' height='" + SCREEN_HEIGHT+ "'></canvas>";
  
  // Exibe as salas de jogo e inicia monitoramento de alterações nas salas
  var jogandoAgora = gameInfo.filter(x => x.START);
  var infoText = "";
    
  for (var i = 0; i < SUPABASE_PLAYER_TABLES.length; i++) {
    if (jogandoAgora.findIndex(x => x.INDEX == i) >= 0) {
      infoText += "<button value ='" + i +"' id='sala" + i + "' disabled>Entrar na sala " + (i+1) + "</button> <div class='inline' id='n" + i + "'></div><br><br>";
    } else {
      infoText += "<button value ='" + i +"' id='sala" + i + "'>Entrar na sala " + (i+1) + "</button> <div class='inline' id='n" + i + "'></div><br><br>";
    }
  }
  
  // Preenche informações iniciais das salas
  document.getElementById('salas').innerHTML = infoText; 
    
  // Exibe a quantidade de jogadores em cada sala de jogo no início da sessão
  for (var i = 0; i < SUPABASE_PLAYER_TABLES.length; i++) {
    BOSS_IN_ROOMS[i] = gameInfo[gameInfo.findIndex(x => x.INDEX == i)].BOSS;
    consultaInfoComIndice(SUPABASE_PLAYER_TABLES[i], i).then(({data, indice}) => {
      NUM_PLAYERS_IN_ROOMS[indice] = data.length;
      if (data.length == 1) {
        document.getElementById(`n${indice}`).innerHTML = new String(`${data.length} jogador`);
      } else {
        document.getElementById(`n${indice}`).innerHTML = new String(`${data.length} jogadores`);
      }
    });
  }
}

// Atualização das telas com as informações alteradas
function atualizaTela(indice, quantidade) {
          
  if (quantidade == 1) {
    document.getElementById(`n${indice}`).innerHTML = new String(`${NUM_PLAYERS_IN_ROOMS[indice]} jogador`);
  } else {
    document.getElementById(`n${indice}`).innerHTML = new String(`${NUM_PLAYERS_IN_ROOMS[indice]} jogadores`);
  }  
          
}

// Utiliza realtime da tabela no SUPABASE para monitorar alterações
async function monitoraSupabase() {
  const data = await _supa.from('*')
    .on('*', payload => {
      
      // Caso tenha sido alterada alguma tabela de jogador (SUPABASE_PLAYER_TABLES)
      if (SUPABASE_PLAYER_TABLES.indexOf(payload.table) >= 0) {
        escutaTabelaJogador(payload); 
        atualizaTela(SUPABASE_PLAYER_TABLES.indexOf(payload.table), data.length);
      }
      
      // Caso tenha sido alterada alguma tabela de inimigo (SUPABASE_ENEMY_TABLES)
      if (SUPABASE_ENEMY_TABLES.indexOf(payload.table) >= 0) {
        escutaTabelaInimigo(payload);
      }
      
      // Caso tenha sido alterada alguma tabela de informações dos jogos (SUPABASE_INFO_TABLE)
      if (SUPABASE_INFO_TABLE.indexOf(payload.table) >= 0) {
        escutaTabelaGameInfo(payload);
      }
      
    })
    .subscribe()
  
    // Exibe os dados se estiver no modo debug (debugMode = true) 
    if (debugMode) {console.log("SUBSCRIPTION DATA: ", data.topic);}
  
  return data; 
}

// Define ações caso haja alguma alteração nas tabelas dos jogadores (INSERT, UPDATE, DELETE)
function escutaTabelaJogador(payload) {

  // Caso algum jogador tenha entrado em uma sala
  if (payload.eventType == "INSERT") {
              
    if (debugMode) {console.log("MONITORADO: " + payload.eventType, ": ", payload.new)};
         
    // atualiza quantidade de jogadores nas salas
    NUM_PLAYERS_IN_ROOMS[SUPABASE_PLAYER_TABLES.indexOf(payload.table)]++;
    
    // acrescenta jogador incluído caso não seja o jogador desse cliente e esteja nessa sala
    if (CURRENT_PLAYER_ID != payload.new.id && SUPABASE_PLAYER_TABLES[CURRENT_PLAYER_ROOM] == payload.table) {  
      CURRENT_ROOM_NAMES[payload.new.id] = payload.new.playerName;
      CURRENT_ROOM_POINTS[payload.new.id] = 0;
      exibePontuacao();
      GAME.addPlayer({
        playerId: payload.new.id,
        playerX: payload.new.playerX, 
        playerY: payload.new.playerY
      });
    }
  } //INSERT 
    
  // Caso algum jogador tenha se movimentado em uma sala (ou a pontuação alterada)
  if (payload.eventType == "UPDATE") {
        
    if (debugMode) {console.log("MONITORADO: " + payload.eventType, ": ", payload.new)};
        
    // atualiza jogador alterado na tabela caso não seja desse cliente e esteja nessa sala
    if (CURRENT_PLAYER_ID != payload.new.id && SUPABASE_PLAYER_TABLES[CURRENT_PLAYER_ROOM] == payload.table) {  
          
      // Altera pontuações dos jogadores
      if (CURRENT_ROOM_POINTS[payload.new.id] != payload.new.playerPTS){
        
        CURRENT_ROOM_POINTS[payload.new.id] = payload.new.playerPTS;
        exibePontuacao();
        
        if (infoMode) {
          console.log(">> (fora) Inimigo capturado pelo jogador " + payload.new.id);
          console.log(">> (fora) Pontuação: " + payload.new.playerPTS);
        }
      }
      
      // Altera posições dos jogadores
      GAME.state.players[payload.new.id] = {
        x: payload.new.playerX,
        y: payload.new.playerY
      };
    }
  } //UPDATE
  
  // Caso algum jogador tenha saído de uma sala
  if (payload.eventType == "DELETE") {
        
    if (debugMode) {console.log("MONITORADO: " + payload.eventType, ": ", payload.old)};
          
    // atualiza quantidade de jogadores nas salas
    NUM_PLAYERS_IN_ROOMS[SUPABASE_PLAYER_TABLES.indexOf(payload.table)]--;
          
    // atualiza informações caso já exista um jogador e esteja nessa sala
    if (CURRENT_PLAYER_ID && SUPABASE_PLAYER_TABLES[CURRENT_PLAYER_ROOM] == payload.table) {    
      
      // se foi o jogador que iniciou o jogo
      if (payload.old.id == BOSS_IN_ROOMS[CURRENT_PLAYER_ROOM]) {
      
        // se jogador removido foi o desse cliente
        if (payload.old.id == CURRENT_PLAYER_ID) {
      
          let gameInfo = {};
          eliminaInimigosComJogadorQueEncerrouJogo();
          var intervalo = setInterval(function() {
            if (APAGOU_TUDO) {        
              APAGOU_TUDO = false;
              gameInfo = {BOSS: null, TIME: new Date(), START: false}; 
              atualizaGameInfoNoBancoDeDados(gameInfo, CURRENT_PLAYER_ROOM).then((data) => {
                if (debugMode) {console.log(data);}
                // Reinicia objeto do jogo
                GAME = createGame();
                renderScreen(document.getElementById('screen'), GAME, requestAnimationFrame, CURRENT_PLAYER_ID);
                clearInterval(intervalo);
              });
            }
          }, 250); 
          
        } else {
        
          // apaga informações do jogador removido e o elimina do objeto do jogo
          delete CURRENT_ROOM_NAMES[payload.old.id];
          delete CURRENT_ROOM_POINTS[payload.old.id]; 
          GAME.removePlayer({playerId: payload.old.id});
          
          // Reinicia pontuação dos jogadores
          let updatedPoints = [];
          var numPlayers = 0;
          for (const playerID in CURRENT_ROOM_POINTS) {
            numPlayers++;
            atualizaInfoNoBancoDeDados(SUPABASE_PLAYER_TABLES[CURRENT_PLAYER_ROOM], {playerPTS: 0}, playerID).then((data) => {
              updatedPoints.push(playerID);
              CURRENT_ROOM_POINTS[playerID] = 0;
              if (debugMode) {console.log("Pontos zerados."); console.log(data);}
            });
          }    
          
          var intervalo = setInterval(function() {
            if (numPlayers == updatedPoints.length) {    
              
              // Exibe a pontuação
              exibePontuacao();
              
              // Finaliza reinicio da pontuação dos jogadores
              clearInterval(intervalo);
            }
          }, 500); 
        }
      
      } else {
        
        // apaga informações do jogador removido e o elimina do objeto do jogo
        delete CURRENT_ROOM_NAMES[payload.old.id];
        delete CURRENT_ROOM_POINTS[payload.old.id]; 
        GAME.removePlayer({playerId: payload.old.id});
        
        // se jogador removido foi o desse cliente
        if (payload.old.id == CURRENT_PLAYER_ID) {
        
          // Atualiza botão de jogar
          document.getElementById("start").innerHTML = "INICIAR";
          document.getElementById("start").value = "";
          document.getElementById("start").disabled = true;
        
          document.getElementById("out").innerHTML = "Sair da sala";
          document.getElementById("out").value = "";
          document.getElementById("out").disabled = true;
          
          // Reinicia variáveis globais
          CURRENT_PLAYER_ID = null;
          CURRENT_PLAYER_ROOM = null;
          CURRENT_ROOM_ENEMIES = [];
          CURRENT_ROOM_NAMES = {};
          CURRENT_ROOM_POINTS = {};
          
          // Reinicia objeto do jogo
          GAME = createGame();
          renderScreen(document.getElementById('screen'), GAME, requestAnimationFrame, CURRENT_PLAYER_ID);
          
        } 
        
        // Exibe a pontuação
        exibePontuacao();
        
      }   
    }
  } //DELETE 
  
}

// Define ações caso haja alguma alteração nas tabelas dos inimigos (INSERT)
function escutaTabelaInimigo(payload) {
  // Caso alguma fruta tenha sido criada nessa sala
  if (payload.eventType == "INSERT") {      
    if (payload.new.id != CURRENT_PLAYER_ID && SUPABASE_ENEMY_TABLES[CURRENT_PLAYER_ROOM] == payload.table) { 
      CURRENT_ROOM_ENEMIES.push(payload.new.id);
      GAME.state.fruits[payload.new.id] = {
        x: payload.new.x,
        y: payload.new.y
      };  
    }
  } //INSERT
  
  // Caso alguma fruta tenha sido criada nessa sala
  if (payload.eventType == "DELETE") {      
    if (payload.old.id != CURRENT_PLAYER_ID && SUPABASE_ENEMY_TABLES[CURRENT_PLAYER_ROOM] == payload.table) { 
      GAME.removeFruit({fruitId: payload.old.id});
    }
  } //DELETE
}

// Define ações caso haja alguma alteração na tabela de configuração do jogo (UPDATE)
function escutaTabelaGameInfo(payload) {
  // Caso alguma fruta tenha sido criada nessa sala
  if (payload.eventType == "UPDATE") {  
    if (payload.new.START) {
      if (CURRENT_PLAYER_ID != payload.new.BOSS && CURRENT_PLAYER_ROOM == payload.new.INDEX) {
        document.getElementById("start").disabled = true; 
      }
      document.getElementById(`sala${(payload.new.INDEX)}`).disabled = true;
      BOSS_IN_ROOMS[payload.new.INDEX] = payload.new.BOSS;
    } else {
      if (CURRENT_PLAYER_ID != BOSS_IN_ROOMS[payload.old.INDEX] && CURRENT_PLAYER_ROOM == payload.old.INDEX) {
        document.getElementById("start").disabled = false; 
      }
      document.getElementById(`sala${(payload.old.INDEX)}`).disabled = false; 
      BOSS_IN_ROOMS[payload.old.INDEX] = null;
    }   
    // Exibe a pontuação
    exibePontuacao();
  } //UPDATE
}

// Monitora teclas do jogador na tela do jogo (teclas, botões de entrar e botão de jogar)
function monitoraTela() {
  
  // executa ações quando botão de "entrar na sala" for acionado
  escutaBotaoEntrar();
  
  // executa ações quando botão de "sair da sala" for acionado
  escutaBotaoSair();
  
  // executa ações quando botão de "iniciar/encerrar" for acionado
  escutaBotaoIniciar();
  
  // executa ações quando alguma tecla for acionada
  escutaTeclas();
  
  // executa ações quando algum toque for acionado
  escutaToques();
  
}

// Executa ações quando botão de "entrar na sala" for acionado
function escutaBotaoEntrar() {

  // Escuta a sala selecionada pelo jogador
  document.getElementById('salas').addEventListener('click', (element) => {
    
    if (debugMode) { console.log("SALA: " + element.path[0].value); }
    
    // Só pode criar um jogador por cliente
    if (CURRENT_PLAYER_ID == null) {     
      if (document.getElementById("PlayerName").value == "") {
        alert("Preencha o nome do jogador"); return;
      } else {
        criaJogador({
          playerName: document.getElementById("PlayerName").value,
          playerX: Math.floor(Math.random() * GAME.state.screen.width),
          playerY: Math.floor(Math.random() * GAME.state.screen.height),
          playerPTS: 0
        }, element.path[0].value); 
       } 
    } else{
      if (debugMode) { console.log("Jogador " + CURRENT_PLAYER_ID + " já existe!"); }
    }
    
  });
}
 
// Executa ações quando botão de "sair da sala" for acionado
function escutaBotaoSair() {

  // Escuta a sala selecionada pelo jogador
  document.getElementById('out').addEventListener('click', (element) => {
    
    if (debugMode) { console.log("SALA: " + element.path[0].value); }
    
    eliminaInimigosComJogadorQueSaiuDaSala();
    exibePontuacao();
    
  }); 
}

// Elimina inimigos e jogadores da sala (botão sair da sala)
function eliminaInimigosComJogadorQueSaiuDaSala() {
  
  // remove jogador que pediu para sair do banco de dados
  removeInfoNoBancoDeDados(SUPABASE_PLAYER_TABLES[CURRENT_PLAYER_ROOM], CURRENT_PLAYER_ID).then((data) => {
    if (debugMode) {console.log("Pediu pra sair: ");console.log(data);}
  }); 
  
  // Atualiza botão de jogar
  document.getElementById("start").innerHTML = "INICIAR";
  document.getElementById("start").value = "";
  document.getElementById("start").disabled = true;
      
  document.getElementById("out").innerHTML = "Sair da sala";
  document.getElementById("out").value = "";
  document.getElementById("out").disabled = true;
            
  // Remove os inimigos do objeto do jogo desse cliente
  for (var i = 0; i < CURRENT_ROOM_ENEMIES.length; i++) {
    GAME.removeFruit({ fruitId: CURRENT_ROOM_ENEMIES[i]});
  }
            
  // Remove os jogadores do objeto do jogo desse cliente
  for (const playerID in CURRENT_ROOM_NAMES) {
    GAME.removePlayer({playerId: playerID});
  }  
      
  // Atualiza as variáveis globais
  CURRENT_PLAYER_ID = null;     
  CURRENT_PLAYER_ROOM = null;
  CURRENT_ROOM_ENEMIES = [];
  CURRENT_ROOM_NAMES = {};
  CURRENT_ROOM_POINTS = {};
  
}

// Cria o jogador desse cliente na sala escolhida
function criaJogador(novoJogador, indiceSala) {
  
  // Exibe botão de JOGAR
  document.getElementById("start").innerHTML = "INICIAR";
  document.getElementById("start").value = indiceSala;
  document.getElementById("start").disabled = false;
  
  var numSala = parseInt(indiceSala) + 1; // para não "bugar" a soma
  document.getElementById("out").innerHTML = "Sair da sala " + numSala;
  document.getElementById("out").value = indiceSala;
  document.getElementById("out").disabled = false;
    
  // Atualiza variável global com índice da sala
  CURRENT_PLAYER_ROOM = indiceSala;
  
  // Insere novo jogador na base de dados (sala)       
  adicionaInfoNoBancoDeDados(SUPABASE_PLAYER_TABLES[CURRENT_PLAYER_ROOM], novoJogador).then((jogador) => {
    
    // Atualiza as demais variáveis globais (após definição do ID)
    CURRENT_PLAYER_ID = jogador[0].id;
    CURRENT_ROOM_NAMES[jogador[0].id] = jogador[0].playerName;
    CURRENT_ROOM_POINTS[jogador[0].id] = 0;
     
    if (infoMode) {
      console.log("My ID: " + CURRENT_PLAYER_ID);
      console.log("My ROOM: " + CURRENT_PLAYER_ROOM);
    } 
         
    // Cria novo jogador no objeto do jogo
    GAME.addPlayer({
      playerId: jogador[0].id,
      playerX: jogador[0].playerX,
      playerY: jogador[0].playerY
    });
         
    // Mostra jogadores que já estão na sala
    exibeJogadores();

    // Inicia renderização do jogo
    renderScreen(document.getElementById('screen'), GAME, requestAnimationFrame, CURRENT_PLAYER_ID);

  });     
}

// Exibe jogadores que já estão na sala
function exibeJogadores() {
  consultaInfoSemIndice(SUPABASE_PLAYER_TABLES[CURRENT_PLAYER_ROOM]).then((data) => {

    for (var i = 0; i < data.length; i++) {
          
      CURRENT_ROOM_NAMES[data[i].id] = data[i].playerName;
      CURRENT_ROOM_POINTS[data[i].id] = 0;
          
      // Cria o jogador no objeto desse cliente
      GAME.addPlayer({
        playerId: data[i].id,
        playerX: data[i].playerX, 
        playerY: data[i].playerY
      });
     
      if (infoMode) {
        console.log(data[i].playerName + " (" + data[i].id + ") = " + data[i].playerX + " x " + data[i].playerY + " -> " + data[i].playerPTS);  
      } 
      
      // Mostra pontos dos jogadores que já estão na sala
      exibePontuacao();
    }
    
    if (debugMode) {
      console.log(CURRENT_ROOM_NAMES);
      console.log(CURRENT_ROOM_POINTS);
    }
    
  });
}

// Executa ações quando botão de "iniciar/encerrar" for acionado
function escutaBotaoIniciar() {
  
  // Escuta o botão de iniciar o jogo
  document.getElementById('start').addEventListener('click', (element) => {
    
    var thisRoom = element.path[0].value;
    var option = "ERRO: INICIAR/ENCERRAR";
    var gameInfo = {};
    
    // Só pode iniciar um jogo se houver jogador
    if (CURRENT_PLAYER_ID != null) {
      option = document.getElementById("start").innerHTML;
      if (debugMode) {console.log("OPÇÃO: " + option);}
      
      if (option == "INICIAR") { 
        criaInimigos();
        gameInfo = {BOSS: CURRENT_PLAYER_ID, TIME: new Date(), START: true}; 
        atualizaGameInfoNoBancoDeDados(gameInfo, thisRoom).then((data) => {
          if (debugMode) {console.log(data);}
        });
      }
      
      if (option == "ENCERRAR") {
        eliminaInimigosComJogadorQueEncerrouJogo();
        var intervalo = setInterval(function() {
          if (APAGOU_TUDO) {        
            APAGOU_TUDO = false;
            gameInfo = {BOSS: null, TIME: new Date(), START: false};
            atualizaGameInfoNoBancoDeDados(gameInfo, thisRoom).then((data) => {
              if (debugMode) {console.log(data);}
              clearInterval(intervalo);
            });
          }
        }, 250); 
      }
    }
  });
}

// Cria o inimigo desse cliente na sala escolhida
function criaInimigos() {
  
  if (infoMode) { console.log("JOGO INICIADO !!!"); }
  
  // Exibe botão de SAIR
  document.getElementById("start").innerHTML = "ENCERRAR";
  
  document.getElementById("out").innerHTML = "Sair da sala";
  document.getElementById("out").value = "";
  document.getElementById("out").disabled = true;
  
  var intervalo = setInterval(function() {
    
    if (CURRENT_PLAYER_ID) { //caso jogador saia da sala, a crição de inimigos é suspensa
      
      // Cria informações da nova fruta       
      var novaFruta = {
        x: Math.floor(Math.random() * GAME.state.screen.width),
        y: Math.floor(Math.random() * GAME.state.screen.height)
      }    
      
      // Insere nova fruta na base de dados (sala)
      adicionaInfoNoBancoDeDados(SUPABASE_ENEMY_TABLES[CURRENT_PLAYER_ROOM], novaFruta).then((fruta) => {
        CURRENT_ROOM_ENEMIES.push(fruta[0].id);
        if (infoMode) {console.log("New fruit ID: " + fruta[0].id);} 
      });
      
    } else {
      
      if (infoMode) { console.log("JOGO FINALIZADO !!!"); }
      
      exibePontuacao();
      
      // Suspende a criação de novas frutas
      clearInterval(intervalo);
    }

  }, TAXA_INIMIGOS);

}

// Elimina inimigos e jogadores da sala (botão encerrar)
function eliminaInimigosComJogadorQueEncerrouJogo() {

  APAGOU_TUDO = false;
  
  var thisPlayer = CURRENT_PLAYER_ID; // Precisa usar essa informação depois
  CURRENT_PLAYER_ID = null; // Importante tornar null para suspender a criação de frutas na sala
    
  // Remove inimigos do banco de dados (e apenas jogador que pediu para sair)
  var removedEnemies = [];
  for (var i = 0; i < CURRENT_ROOM_ENEMIES.length; i++) {
    removeInfoNoBancoDeDados(SUPABASE_ENEMY_TABLES[CURRENT_PLAYER_ROOM], CURRENT_ROOM_ENEMIES[i]).then((data) => {
      removedEnemies.push(CURRENT_ROOM_ENEMIES[i]);
      if (debugMode) {console.log("Inimigo removido."); console.log(data);}
    });    
  }
  
  // Remove todos os pontos dos jogadores da sala atual
  let updatedPoints = [];
  var numPlayers = 0;
  for (const playerID in CURRENT_ROOM_POINTS) {
    numPlayers++;
    atualizaInfoNoBancoDeDados(SUPABASE_PLAYER_TABLES[CURRENT_PLAYER_ROOM], {playerPTS: 0}, playerID).then((data) => {
      updatedPoints.push(playerID);
      CURRENT_ROOM_POINTS[playerID] = 0;
      if (debugMode) {console.log("Pontos zerados."); console.log(data);}
    });
  }    
          
  // Atualiza objeto do jogo
  var intervalo = setInterval(function() {
       
    if (CURRENT_ROOM_ENEMIES.length == removedEnemies.length && numPlayers == updatedPoints.length) {
           
      // Remove jogador que pediu para sair do banco de dados
      removeInfoNoBancoDeDados(SUPABASE_PLAYER_TABLES[CURRENT_PLAYER_ROOM], thisPlayer).then((data) => {
        if (debugMode) {console.log("Pediu pra sair: ");console.log(data);}
      });  
      
      // Atualiza botão de jogar
      document.getElementById("start").innerHTML = "INICIAR";
      document.getElementById("start").value = "";
      document.getElementById("start").disabled = true;
      
      document.getElementById("out").innerHTML = "Sair da sala";
      document.getElementById("out").value = "";
      document.getElementById("out").disabled = true;
            
      // Remove os inimigos do objeto do jogo desse cliente
      for (var i = 0; i < CURRENT_ROOM_ENEMIES.length; i++) {
        GAME.removeFruit({ fruitId: CURRENT_ROOM_ENEMIES[i]});
      }
            
      // Remove os jogadores do objeto do jogo desse cliente
      var removedPlayers = 0;
      for (const playerID in CURRENT_ROOM_NAMES) {
        GAME.removePlayer({playerId: playerID});
        removedPlayers++;
      }  
      
      // Atualiza as demais variáveis globais
      CURRENT_PLAYER_ROOM = null;
      CURRENT_ROOM_ENEMIES = [];
      CURRENT_ROOM_NAMES = {};
      CURRENT_ROOM_POINTS = {};
          
      if (infoMode) {
        console.log(removedEnemies.length + " inimigo(s) removido(s).");
        console.log(removedPlayers + " jogador(es) removido(s).");
        console.log(updatedPoints.length + " ponto(s) zerado(s).");
      }
      
      exibePontuacao();
      
      APAGOU_TUDO = true;
      
      // Finaliza remoção de jogadores e inimigos
      clearInterval(intervalo);
    }

  }, 500); 
 
}

// Executa ações quando alguma tecla for acionada
function escutaTeclas() {
  // Escuta a tecla usada pelo jogador
  document.addEventListener('keydown', (event) => {
    
    if (debugMode) { console.log("TECLA: " + event.key); }
    
    // Só pode mover se já existir jogador
    if (CURRENT_PLAYER_ID != null) {
      moveJogador(event.key);
    }
    
  });
}

// Executa ações quando algum toque for acionado
function escutaToques() {
    
  // Escuta o início do toque
  var ts_x, ts_y;
  document.addEventListener('touchstart', function(e) {
    // e.preventDefault();
    ts_x = e.changedTouches[0].pageX;
    ts_y = e.changedTouches[0].pageY;
  }, false);
  
  // Escuta o fim do toque e registra o movimento correspondente
  document.addEventListener('touchend', function(e) {
    //e.preventDefault();
    var td_x = e.changedTouches[0].pageX - ts_x; // deslocamento na horizontal
    var td_y = e.changedTouches[0].pageY - ts_y; // deslocamento na vertical
   
    //if (BOSS_IN_ROOMS[CURRENT_PLAYER_ROOM]) { // só anda com touch a partir do início do jogo
    if (CURRENT_PLAYER_ID) { // só anda com touch a partir da entrada na sala
      
      // O movimento principal foi vertical ou horizontal?
      if( Math.abs( td_x ) > Math.abs( td_y ) ) {
        // é horizontal
        if( td_x < 0 ) {
          if (debugMode) {console.log("TOUCH: ArrowLeft");}
          moveJogador("ArrowLeft");
        } else {
          if (debugMode) {console.log("TOUCH: ArrowRight");}
          moveJogador("ArrowRight");
        }
      } else {
        // é vertical
        if( td_y < 0 ) {
          if (debugMode) {console.log("TOUCH: ArrowUp");}
          moveJogador("ArrowUp");
        } else {
          if (debugMode) {console.log("TOUCH: ArrowDown");}
          moveJogador("ArrowDown");
        }
      }
    }
     
  }, false);
  
/*let haveMovementBuffer = false

  document.addEventListener("touchstart",handleTouchPad)
  function handleTouchPad(event){
    const touchX =  event.touches[0].clientX;
    const touchY =  event.touches[0].clientY;
    if(!haveMovementBuffer){ 
      if(snake.direction.x !== 0){
        if(touchY < screenHalfdHeight && snake.direction.y !== 1){
          snake.direction = { x: 0, y: -1};
          haveMovementBuffer = true;  
        } 
        else if (touchY > screenHalfdHeight && snake.direction.y !== -1){
          snake.direction = { x: 0, y: 1};
          haveMovementBuffer = true; 
        }
      }
      else if (snake.direction.y !== 0){
        if(touchX < screenHalfWidth && snake.direction.x !== 1){
          snake.direction = { x: -1, y: 0};
          haveMovementBuffer = true;  
        } 
        else if (touchX > screenHalfWidth && snake.direction.x !== -1){
          snake.direction = { x: 1, y: 0};
          haveMovementBuffer = true; 
        }
      } 
    }
    
  }  

  document.addEventListener("keydown", moveSnake);
  function moveSnake(e){
    if(!haveMovementBuffer){
      if(e.keyCode === 39 && snake.direction.x !== -1 ){ 
        snake.direction = { x: 1, y: 0};
        haveMovementBuffer = true;
      }
      else if(e.keyCode === 40 && snake.direction.y !== -1) {
        snake.direction = { x: 0, y: 1};
        haveMovementBuffer = true;
      }
      else if(e.keyCode === 37 && snake.direction.x !== 1) {
        snake.direction = { x: -1, y: 0};
        haveMovementBuffer = true;
      }
      else if(e.keyCode === 38 && snake.direction.y !== 1) {
        snake.direction = { x: 0, y: -1};
        haveMovementBuffer = true;
      }
    }
  }
  */

}

// Move o jogador desse cliente na sala escolhida
function moveJogador(tecla) {
  
  if (debugMode) { console.log("MOVER: " + tecla); }
    
  // Move o jogador no objeto desse cliente
  GAME.movePlayer({
    playerId: CURRENT_PLAYER_ID,
    keyPressed: tecla
  });
  
  var novaPosicao = {
    playerX: GAME.state.players[CURRENT_PLAYER_ID].x, 
    playerY: GAME.state.players[CURRENT_PLAYER_ID].y
  }

  // Insere novo jogador na base de dados
  atualizaInfoNoBancoDeDados(SUPABASE_PLAYER_TABLES[CURRENT_PLAYER_ROOM], novaPosicao, CURRENT_PLAYER_ID).then((data) => {});
   
}  
  
function removeFrutasComAtribuicaoDePontos(fruitId) {
  
  // Remove do banco de dados assim que foi removida do jogo (para afetar demais jogadores)
  removeInfoNoBancoDeDados(SUPABASE_ENEMY_TABLES[CURRENT_PLAYER_ROOM], fruitId).then((data) => {
    if (debugMode) {console.log(data);}
  }); 
              
  CURRENT_ROOM_POINTS[CURRENT_PLAYER_ID]++;
                
  var novaPontuacao = {
    playerPTS: CURRENT_ROOM_POINTS[CURRENT_PLAYER_ID]
  }
  
  // Insere pontuação do jogador na base de dados
  atualizaInfoNoBancoDeDados(SUPABASE_PLAYER_TABLES[CURRENT_PLAYER_ROOM], novaPontuacao, CURRENT_PLAYER_ID).then((data) => {
    exibePontuacao();
    if (infoMode) {
      console.log(">> Inimigo " + fruitId + " capturado pelo jogador " + CURRENT_PLAYER_ID);
      console.log(">> Pontuação: " + CURRENT_ROOM_POINTS[CURRENT_PLAYER_ID]);
    }
    if (debugMode) {
      console.log(data);
    }
  });
}

// Função para tratar o objeto do jogo (em cada cliente)
function createGame() {
    const state = {
        players: {},
        fruits: {},
        screen: {
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT
        }
    }

    const observers = []

    function start(tempo) {
        const frequency = tempo

        setInterval(addFruit, frequency)
    }

    function subscribe(observerFunction) {
        observers.push(observerFunction)
    }

    function notifyAll(command) {
        for (const observerFunction of observers) {
            observerFunction(command)
        }
    }

    function setState(newState) {
        Object.assign(state, newState)
    }

    function addPlayer(command) {
        const playerId = command.playerId
        const playerX = command.playerX;  
        const playerY = command.playerY;
      
        //const playerX = 'playerX' in command ? command.playerX : Math.floor(Math.random() * state.screen.width)
        //const playerY = 'playerY' in command ? command.playerY : Math.floor(Math.random() * state.screen.height)
        
        state.players[playerId] = {
            x: playerX,
            y: playerY
        }

        notifyAll({
            type: 'add-player',
            playerId: playerId,
            playerX: playerX,
            playerY: playerY
        })
    }

    function removePlayer(command) {
        const playerId = command.playerId

        delete state.players[playerId]

        notifyAll({
            type: 'remove-player',
            playerId: playerId
        })
    }

    function addFruit(command) {
        const fruitId = command ? command.fruitId : Math.floor(Math.random() * 10000000)
        const fruitX = command ? command.fruitX : Math.floor(Math.random() * state.screen.width)
        const fruitY = command ? command.fruitY : Math.floor(Math.random() * state.screen.height)

        state.fruits[fruitId] = {
            x: fruitX,
            y: fruitY
        }

        notifyAll({
            type: 'add-fruit',
            fruitId: fruitId,
            fruitX: fruitX,
            fruitY: fruitY
        })
    }

    function removeFruit(command) {
        const fruitId = command.fruitId

        delete state.fruits[fruitId]

        notifyAll({
            type: 'remove-fruit',
            fruitId: fruitId,
        })
    }

    function movePlayer(command) {
        notifyAll(command)
      
        const acceptedMoves = {
            ArrowUp(player) {
                if (player.y - 1 >= 0) {
                    player.y = player.y - 1
                }
            },
            ArrowRight(player) {
                if (player.x + 1 < state.screen.width) {
                    player.x = player.x + 1
                }
            },
            ArrowDown(player) {
                if (player.y + 1 < state.screen.height) {
                    player.y = player.y + 1
                }
            },
            ArrowLeft(player) {
                if (player.x - 1 >= 0) {
                    player.x = player.x - 1
                }
            }
        }

        const keyPressed = command.keyPressed
        const playerId = command.playerId
        const player = state.players[playerId]
        const moveFunction = acceptedMoves[keyPressed]

        if (player && moveFunction) {
            moveFunction(player)
            checkForFruitCollision(playerId)
        }

    }

    function checkForFruitCollision(playerId) {
        const player = state.players[playerId]

        for (const fruitId in state.fruits) {
            const fruit = state.fruits[fruitId]
            if (debugMode) {console.log(`Checking ${playerId} and ${fruitId}`)}

            if (player.x === fruit.x && player.y === fruit.y) {
                if (debugMode) {console.log(`COLLISION between ${playerId} and ${fruitId}`)}
                removeFruit({ fruitId: fruitId })
                
                // atribui os pontos e remove os inimigos no banco de dados
                removeFrutasComAtribuicaoDePontos(fruitId);
                    
            }
        }
    }

    return {
        addPlayer,
        removePlayer,
        movePlayer,
        addFruit,
        removeFruit,
        state,
        setState,
        subscribe,
        start
    }
}

// Funnção para renderizar objetos dentro do canvas na tela
function renderScreen(screen, game, requestAnimationFrame, currentPlayerId) {
    const context = screen.getContext('2d')
    context.fillStyle = 'white'
    context.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)

    for (const playerId in game.state.players) {
        const player = game.state.players[playerId]
        context.fillStyle = 'black'
        context.fillRect(player.x, player.y, 1, 1)
    }

    for (const fruitId in game.state.fruits) {
        const fruit = game.state.fruits[fruitId]
        context.fillStyle = 'orange'
        context.fillRect(fruit.x, fruit.y, 1, 1)
    }

    const currentPlayer = game.state.players[currentPlayerId]

    if(currentPlayer) {
        context.fillStyle = 'red'
        context.fillRect(currentPlayer.x, currentPlayer.y, 1, 1)
    }

    requestAnimationFrame(() => {
        renderScreen(screen, game, requestAnimationFrame, currentPlayerId)
    })
}
