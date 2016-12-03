textToGame = function(text, seed) {
	var game = JSON.parse(text)

	if (game.version != 11) {
		alert("Invalid version number: " + json_game.version);
	}

	//Adds determinism (when used with https://github.com/davidbau/seedrandom) to color scramble.
	console.log(seed);
	Math.seedrandom(seed);

	//Hardcoding colors:
	var colors = [];
	colors.push('0xe37222'); //TS Orange
	colors.push('0x63ceca'); //TS Mid Teal
	//colors.push('0x002226'); //TS Midnight Teal
	colors.push('0xffbe00'); //TS Yellow
	colors.push('0xff0000');
	colors.push('0x00cc00');
	colors.push('0xaa4444');
	colors.push('0x9900ff');
	colors.push('0xff66ff');

	var x, i;
	for (i = colors.length; i; i--) {
		var j = Math.floor(Math.random() * i);
		x = colors[i - 1];
		colors[i - 1] = colors[j];
		colors[j] = x;
	}

	game.players = []
	game.players.push({name: 'NULL', color: "0x888888"});
	for(i = 0; i < game.num_players; i++) {
		game.players.push({name: game.player_names[i], color: colors[i] });
		console.log(game.players[game.players.length - 1].color);
	}
	delete game.player_names;

	console.log(game.players);

	var maxProd = 0;
	for(var a = 0; a < game.height; a++) {
		for(var b = 0; b < game.width; b++) {
			if(game.productions[a][b] > maxProd) maxProd = game.productions[a][b];
		}
	}

	game.productionNormals = []
	for(var a = 0; a < game.height; a++) {
		var row = []
		for(var b = 0; b < game.width; b++) {
			row.push(game.productions[a][b] / maxProd);
		}
		game.productionNormals.push(row)
	}

	for(var a = 0; a < game.num_frames; a++) {
		for(var b = 0; b < game.height; b++) {
			for(var c = 0; c < game.width; c++) {
				var array = game.frames[a][b][c];
				game.frames[a][b][c] = { owner: array[0], strength: array[1] };
			}
		}
	}

	var stats = [];
	for(var a = 0; a < game.num_frames - 1; a++) {
		stats[a] = processFrame(game, a);
	}

	//Get game statistics:
	for(var a = 1; a <= game.num_players; a++) {
		game.players[a].territories = [];
		game.players[a].productions = [];
		game.players[a].strengths = [];
		game.players[a].actualProduction = [];
		game.players[a].playerDamageDealt = [];
		game.players[a].environmentDamageDealt = [];
		game.players[a].damageTaken = [];
		game.players[a].capLosses = [];

		for(var b = 0; b < game.num_frames; b++) {
			var ter = 0, prod = 0, str = 0;
			for(var c = 0; c < game.height; c++) for(var d = 0; d < game.width; d++) {
				if(game.frames[b][c][d].owner == a) {
					ter++;
					prod += game.productions[c][d];
					str += game.frames[b][c][d].strength;
				}
			}

			game.players[a].territories.push(ter);
			game.players[a].productions.push(prod);
			game.players[a].strengths.push(str);
			if (b < game.num_frames - 1) {
				if (b > 0) {
					game.players[a].actualProduction.push(game.players[a].actualProduction[b - 1] + stats[b][a - 1].actualProduction);
					game.players[a].environmentDamageDealt.push(game.players[a].environmentDamageDealt[b - 1] + stats[b][a - 1].environmentDamageDealt);
					game.players[a].damageTaken.push(game.players[a].damageTaken[b - 1] + stats[b][a - 1].damageTaken - stats[b][a - 1].environmentDamageDealt);
					game.players[a].playerDamageDealt.push(game.players[a].playerDamageDealt[b - 1] + stats[b][a - 1].overkillDamage);
					game.players[a].capLosses.push(game.players[a].capLosses[b - 1] + stats[b][a - 1].capLosses);
				} else {
					game.players[a].actualProduction.push(stats[b][a - 1].actualProduction);
					game.players[a].environmentDamageDealt.push(stats[b][a - 1].environmentDamageDealt);
					game.players[a].damageTaken.push(stats[b][a - 1].damageTaken - stats[b][a - 1].environmentDamageDealt);
					game.players[a].playerDamageDealt.push(stats[b][a - 1].overkillDamage);
					game.players[a].capLosses.push(stats[b][a - 1].capLosses);
				}
			} else {
				game.players[a].actualProduction.push(0);
				game.players[a].playerDamageDealt.push(0);
				game.players[a].environmentDamageDealt.push(0);
				game.players[a].damageTaken.push(0);
				game.players[a].capLosses.push(0);
			}
		}
	}

	//Normalize game statistics for display
	var maxPlayerTer = 0, maxPlayerProd = 0, maxPlayerStr = 0, maxActProd = 0;
	var maxPlrDmgDlt = 0, maxEnvDmgDlt = 0, maxDmgTkn = 0, maxCapLoss = 0;
	for(var a = 1; a <= game.num_players; a++) {
		for(var b = 0; b < game.num_frames; b++) {
			if(game.players[a].territories[b] > maxPlayerTer) maxPlayerTer = game.players[a].territories[b];
			if(game.players[a].productions[b] > maxPlayerProd) maxPlayerProd = game.players[a].productions[b];
			if(game.players[a].strengths[b] > maxPlayerStr) maxPlayerStr = game.players[a].strengths[b];
			if(game.players[a].actualProduction[b] > maxActProd) maxActProd = game.players[a].actualProduction[b];
			if(game.players[a].playerDamageDealt[b] > maxPlrDmgDlt) maxPlrDmgDlt = game.players[a].playerDamageDealt[b];
			if(game.players[a].environmentDamageDealt[b] > maxEnvDmgDlt) maxEnvDmgDlt = game.players[a].environmentDamageDealt[b];
			if(game.players[a].damageTaken[b] > maxDmgTkn) maxDmgTkn = game.players[a].damageTaken[b];
			if(game.players[a].capLosses[b] > maxCapLoss) maxCapLoss = game.players[a].capLosses[b];
		}
	}
	for(var a = 1; a <= game.num_players; a++) {
		game.players[a].normTers = [];
		game.players[a].normProds = [];
		game.players[a].normStrs = [];
		game.players[a].normActProd = [];
		game.players[a].normPlrDmgDlt = [];
		game.players[a].normEnvDmgDlt = [];
		game.players[a].normDmgTkn = [];
		game.players[a].normCapLoss = [];
		for(var b = 0; b < game.num_frames; b++) {
			game.players[a].normTers.push(game.players[a].territories[b] / maxPlayerTer);
			game.players[a].normProds.push(game.players[a].productions[b] / maxPlayerProd);
			game.players[a].normStrs.push(game.players[a].strengths[b] / maxPlayerStr);
			game.players[a].normActProd.push(game.players[a].actualProduction[b] / maxActProd);
			game.players[a].normPlrDmgDlt.push(game.players[a].playerDamageDealt[b] / maxPlrDmgDlt);
			game.players[a].normEnvDmgDlt.push(game.players[a].environmentDamageDealt[b] / maxEnvDmgDlt);
			game.players[a].normDmgTkn.push(game.players[a].damageTaken[b] / maxDmgTkn);
			game.players[a].normCapLoss.push(game.players[a].capLosses[b] / maxCapLoss);
		}
	}

	return game
}
