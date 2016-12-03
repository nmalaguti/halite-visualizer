function processFrame(game, frameNum) {
    var gameMap = _.cloneDeep(game.frames[frameNum]);
    var moves = game.moves[frameNum];
    var productions = game.productions;
    var width = game.width;
    var height = game.height;
    var numPlayers = game.num_players;

    var STILL = 0;
    var NORTH = 1;
    var EAST  = 2;
    var SOUTH = 3;
    var WEST  = 4;

    var pieces = [];
    var stats = [];

    var p, q, y, x;

    function getLocation(loc, direction) {
        var x = loc.x;
        var y = loc.y;

        if (direction === STILL) {
            // nothing
        } else if (direction === NORTH) {
            y -= 1;
        } else if (direction === EAST) {
            x += 1;
        } else if (direction === SOUTH) {
            y += 1;
        } else if (direction === WEST) {
            x -= 1;
        }

        if (x < 0) {
            x = width - 1;
        } else {
            x %= width;
        }

        if (y < 0) {
            y = height - 1;
        } else {
            y %= height;
        }

        return { x: x, y: y };
    }

    for (p = 0; p < numPlayers; p++) {
        pieces[p] = [];
        stats[p] = {
            actualProduction: 0,
            playerDamageDealt: 0,
            environmentDamageDealt: 0,
            damageTaken: 0,
            capLosses: 0
        };
        for (y = 0; y < height; y++) {
            pieces[p][y] = [];
        }
    }

    for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
            var direction = moves[y][x];
            var cell = gameMap[y][x];
            var player = gameMap[y][x].owner - 1;
            var production = productions[y][x];

            if (gameMap[y][x].owner == 0) continue

            if (direction === STILL) {
                if (cell.strength + production <= 255) {
                    stats[player].actualProduction += production;
                    cell.strength += production;
                } else {
                    stats[player].actualProduction += cell.strength - 255;
                    stats[player].capLosses += cell.strength + production - 255;
                    cell.strength = 255;
                }
            }

            var newLoc = getLocation({ x: x, y: y }, direction);
            if (!_.isUndefined(pieces[player][newLoc.y][newLoc.x])) {
                if (pieces[player][newLoc.y][newLoc.x] + cell.strength <= 255) {
                    pieces[player][newLoc.y][newLoc.x] += cell.strength;
                } else {
                    stats[player].capLosses += pieces[player][newLoc.y][newLoc.x] + cell.strength - 255;
                    pieces[player][newLoc.y][newLoc.x] = 255;
                }
            } else {
                pieces[player][newLoc.y][newLoc.x] = cell.strength;
            }

            // add in a new piece with a strength of 0 if necessary
            if (_.isUndefined(pieces[player][y][x])) {
                pieces[player][y][x] = 0;
            }

            // erase from the game map so that the player can't make another move with the same piece
            gameMap[y][x] = [0, 0]
        }
    }

    var toInjure = [];
    var injureMap = [];

    for (p = 0; p < numPlayers; p++) {
        toInjure[p] = [];
        for (y = 0; y < height; y++) {
            toInjure[p][y] = [];
        }
    }

    for (y = 0; y < height; y++) {
        injureMap[y] = [];
        for (x = 0; x < width; x++) {
            injureMap[y][x] = 0;
        }
    }

    for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
            for (p = 0; p < numPlayers; p++) {
                // if player p has a piece at these coords
                if (!_.isUndefined(pieces[p][y][x])) {
                    // look for other players with pieces here
                    for (q = 0; q < numPlayers; q++) {
                        // exclude the same player
                        if (p !== q) {
                            for (var dir = STILL; dir <= WEST; dir++) {
                                // check STILL square
                                var loc = getLocation({ x: x, y: y}, dir);

                                // if the other player has a piece here
                                if (!_.isUndefined(pieces[q][loc.y][loc.x])) {
                                    // add player p's damage
                                    if (!_.isUndefined(toInjure[q][loc.y][loc.x])) {
                                        toInjure[q][loc.y][loc.x] += pieces[p][y][x];
                                        stats[p].playerDamageDealt += pieces[p][y][x];
                                    } else {
                                        toInjure[q][loc.y][loc.x] = pieces[p][y][x];
                                        stats[p].playerDamageDealt += pieces[p][y][x];
                                    }
                                }
                            }
                        }
                    }

                    // if the environment can do damage back
                    if (gameMap[y][x].strength > 0) {
                        if (!_.isUndefined(toInjure[p][y][x])) {
                            toInjure[p][y][x] += gameMap[y][x].strength;
                        } else {
                            toInjure[p][y][x] = gameMap[y][x].strength;
                        }
                        // and apply damage to the environment
                        injureMap[y][x] += pieces[p][y][x];
                        stats[p].environmentDamageDealt += Math.min(pieces[p][y][x], gameMap[y][x].strength);
                    }
                }
            }
        }
    }

    // injure and/or delete pieces. Note >= rather than > indicates that pieces with a strength of 0 are killed.
    for (p = 0; p < numPlayers; p++) {
        for (y = 0; y < height; y++) {
            for (x = 0; x < width; x++) {
                if (!_.isUndefined(toInjure[p][y][x])) {
                    if (toInjure[p][y][x] >= pieces[p][y][x]) {
                        stats[p].damageTaken += pieces[p][y][x];
                        pieces[p][y][x] = undefined;
                    } else {
                        stats[p].damageTaken += toInjure[p][y][x];
                        pieces[p][y][x] -= toInjure[p][y][x];
                    }
                }
            }
        }
    }

    // apply damage to map pieces
    for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
            if (gameMap[y][x].strength < injureMap[y][x]) {
                gameMap[y][x].strength = 0;
            } else {
                gameMap[y][x].strength -= injureMap[y][x]
            }
            gameMap[y][x].owner = 0;
        }
    }

    // add pieces back into the map
    for (p = 0; p < numPlayers; p++) {
        for (y = 0; y < height; y++) {
            for (x = 0; x < width; x++) {
                if (!_.isUndefined(pieces[p][y][x])) {
                    gameMap[y][x].owner = p + 1;
                    gameMap[y][x].strength = pieces[p][y][x];
                }
            }
        }
    }

    if (frameNum + 1 < gameMap.num_frames - 1) {
        if (!_.isEqual(gameMap, game.frames[frameNum + 1])) {
            throw new Error("Evaluated frame did not match actual game map for frame number " + frameNum);
        }
    }

    return stats;
}
