define(['canvas', 'underscore'], function(canvas, _) {

    var Puzzle = {
        loadMap: function(rawMap) {
            this.constructMap(rawMap);
            canvas.initMap(this.map);
        },
        constructMap: function(rawMap) {
            var world = this;
            var map = [];
            for (var y = 0; y < rawMap.length; y++) {
                map.push([]);
                for (var x = 0; x < rawMap[y].length; x++) {
                    map[y].push({
                        y: y,
                        x: x,
                        isLand: rawMap[y][x] === 1,
                        isAdded: false,
                        getTilesAround: function() {
                            var tiles = this.around || [];
                            if (tiles && tiles.length > 0) {
                                return tiles;
                            }
                            for (var yy = this.y + 1; yy >= this.y - 1; yy--) {
                                for (var xx = this.x + 1; xx >= this.x - 1; xx--) {
                                    if (yy >= 0 && yy < world.map.length &&
                                        xx >= 0 && xx < world.map[0].length &&
                                        !(xx === this.x && yy === this.y)) {
                                        tiles.push(world.map[yy][xx]);
                                    }
                                }
                            }
                            this.around = tiles;
                            return tiles;
                        },
                        isShore: function() {
                            return !!(this.getTilesAround().find(function(it) {
                                return !it.isLand;
                            }));
                        },
                        isSameTile: function(tile) {
                            return this.y === tile.y && this.x === tile.x;
                        }
                    });
                }
            }
            this.map = map;
        },
        parseIslands: function() {
            var map = this.map;
            var islands = [];
            // keep track of land that is processed
            var processedLand = [];

            // recursive to scan land
            var scanLand = function(land, isle) {
                //canvas.fillCell(land.y, land.x, canvas.SHOW);
                if (!processedLand[land.y] || !processedLand[land.y][land.x]) {
                    isle.push(land);
                }
                processedLand[land.y] = processedLand[land.y] || [];
                processedLand[land.y][land.x] = true;

                // look around
                var around = land.getTilesAround().filter(function(next) {
                    return (!processedLand[next.y] || !processedLand[next.y][next.x]) &&
                        next.isLand;
                });
                for (var i = 0; i < around.length; i++) {
                    isle = scanLand(around[i], isle);
                }

                //canvas.fillCell(land.y, land.x, land.isLand ? canvas.LAND : canvas.SEA);
                return isle;
            };

            for (var y = 0; y < map.length; y++) {
                for (var x = 0; x < map[y].length; x++) {
                    if (map[y][x].isLand && (!processedLand[y] || !processedLand[y][x])) {
                        // we hit new land. scan it
                        islands.push(scanLand(map[y][x], []));
                    }
                }
            }
            // build island cache to tiles
            islands.forEach(function(isle) {
                isle.forEach(function(tile) {
                    tile.island = isle;
                });
            });
            this.islands = islands; //.reverse();
            this.sortIslands();
        },
        sortIslands: function() {
            //this.sortMulti = (this.sortMulti * -1) || 1;
            this.islands = this.islands.sort(function(i1, i2) {
                return (i1.length - i2.length); //* this.sortMulti;
            });
        },
        colorIslands: function() {
            for (var i = 0; i < this.islands.length; i++) {
                var c = Math.floor(Math.random() * 156) + 100;
                // var r = Math.floor(Math.random() * 256);
                // var g = Math.floor(Math.random() * 256);
                // var b = Math.floor(Math.random() * 256);
                var isle = this.islands[i];
                for (var ii = 0; ii < isle.length; ii++) {
                    var land = isle[ii];
                    canvas.fillCell(land.y, land.x, "rgb(" + c + "," + c + "," + c + ")");
                }
            }
        },
        connectIslands: function() {
            var self = this;

            // keep track of land that is processed
            var processedTiles = [];

            var distanceBetweenPoints = function(tile1, tile2) {
                return Math.sqrt((Math.pow(Math.abs(tile1.x - tile2.x), 2) + Math.pow(Math.abs(
                    tile1.y - tile2.y), 2)));
            };

            var gravityCenter = function(tiles) {
                var i = 0;
                var y = tiles.reduce(function(sum, t) {
                    i++;
                    return sum + (i > 1 ? 2 * t.y : t.y);
                }, 0);
                i = 0;
                var x = tiles.reduce(function(sum, t) {
                    i++;
                    return sum + (i > 1 ? 2 * t.x : t.x);
                }, 0);
                y = y / (1 + (tiles.length - 1) * 2);
                x = x / (1 + (tiles.length - 1) * 2);
                if (Math.round(y) === tiles[0].y) {
                    y = (y < self.map.length / 2) ? y + 2 : y - 2;
                }
                if (Math.round(x) === tiles[0].x) {
                    x = (x < self.map[0].lenght / 2) ? x + 2 : x - 2;
                }
                return {
                    y: y,
                    x: x
                };
            };

            // mark land as processed. return true if new, false if already processed
            var processLand = function(tile) {
                if (processedTiles[tile.y] && processedTiles[tile.y][tile.x]) {
                    // already processed
                    return false;
                }
                processedTiles[tile.y] = processedTiles[tile.y] ||  [];
                processedTiles[tile.y][tile.x] = true;
                return true;
            };

            var tileBelongsToIsland = function(tile, isle) {
                return tile.island === isle;
            };

            var getIslandForTile = function(tile) {
                return tile.island;
            };

            var findRouteToNextLand = function(land, isle) {
                processedTiles = [];

                var lookFurther = function(nextLevel, startingPoint, nextLand) {
                    // look for one level further for land that is used
                    // for direction calculation
                    var furtherLevel = [];
                    nextLevel.forEach(function(tile) {
                        var around = tile.getTilesAround().filter(function(aroundTile) {
                            return processLand(aroundTile) || aroundTile.isLand
                        });
                        around = _.groupBy(around, function(aroundTile) {
                            return aroundTile.isLand ? 'land' : 'sea';
                        });

                        if (around.sea) {
                            nextLevel = nextLevel.concat(around.sea);
                        }

                        if (around.land && around.land.length > 0) {
                            // collect land tiles of unique islands for the direction count
                            var isles = [];
                            nextLand = nextLand.concat(around.land);
                            nextLand = nextLand.sort(function(land1, land2) {
                                var d1 = distanceBetweenPoints(land1,
                                    startingPoint);
                                var d2 = distanceBetweenPoints(land2,
                                    startingPoint);
                                return d1 - d2;
                            });
                            nextLand = nextLand.filter(function(land, index, array) {
                                var isIslandAlreadyAdded = isles.some(function(
                                    i) {
                                    return i === land.island;
                                });
                                if (isIslandAlreadyAdded) {
                                    return false;
                                }
                                isles.push(land.island);
                                return true;
                            });
                        }
                    });
                    return nextLand;
                }

                var buildBubble = function(bubble) {
                    var currentLevel = bubble[bubble.length - 1];
                    var nextLevel = [];
                    var nextLand = [];
                    var landOhoi = [];
                    var discoveredIslands = 1;
                    var startingPoint = bubble[0][0];
                    // use this to backtrack from land. set as last second last level in bubble
                    var lastSeaTile;

                    for (var i = 0; i < currentLevel.length; i++) {
                        var tile = currentLevel[i];

                        // get tiles around that are not yet processed.
                        var around = tile.getTilesAround().filter(function(aroundTile) {
                            return (processLand(aroundTile) || aroundTile.isLand) &&
                                aroundTile.island !== startingPoint.island;
                        });
                        around = _.groupBy(around, function(aroundTile) {
                            return aroundTile.isLand ? 'land' : 'sea';
                        });

                        if (around.sea) {
                            nextLevel = nextLevel.concat(around.sea);
                        }

                        if (around.land && around.land.length > 0) {
                            // collect land tiles of unique islands for the direction count
                            var isles = [];
                            nextLand = nextLand.concat(around.land);
                            nextLand = nextLand.sort(function(land1, land2) {
                                var d1 = distanceBetweenPoints(land1, startingPoint);
                                var d2 = distanceBetweenPoints(land2, startingPoint);
                                return d1 - d2;
                            });
                            nextLand = nextLand.filter(function(land, index, array) {
                                var isIslandAlreadyAdded = isles.some(function(i) {
                                    return i === land.island;
                                });
                                if (isIslandAlreadyAdded) {
                                    return false;
                                }
                                isles.push(land.island);
                                return true;
                            });

                            // filter only land that is not on current island
                            around.land = around.land.filter(function(newLand) {
                                return !tileBelongsToIsland(newLand, isle);
                            });

                            // only add the land tile, if it connects more islands than currently
                            var islandCount = _.groupBy(around.land, function(aroundLand) {
                                // group land by islands
                                return getIslandForTile(aroundLand);
                            });

                            var discoveredHere = Object.keys(islandCount).length;
                            if (discoveredHere >= discoveredIslands) {
                                // mark the amount of new connections for this bubble
                                if (!bubble.amountOfConnections || discoveredHere >
                                    discoveredIslands) {
                                    bubble.amountOfConnections = function() {
                                        return discoveredIslands;
                                    };
                                }

                                if (discoveredHere > discoveredIslands) {
                                    // this tile connects more than 1 land, must use it
                                    lastSeaTile = tile;
                                    landOhoi = around.land;
                                    break;
                                } else {
                                    // collect the land to list of possibilities
                                    landOhoi = landOhoi.concat(around.land);
                                    discoveredIslands = discoveredHere;
                                }
                            }
                        }
                    }

                    if (landOhoi.length > 0) {
                        // discovered land, exit bubble

                        // if amount of new land found is less than 2, look further
                        if (nextLand.length < 2) {
                            nextLand = lookFurther(nextLevel, startingPoint, nextLand);
                        }

                        // filter unique land
                        landOhoi = landOhoi.filter(function(tile, index, array) {
                            return tile && array.indexOf(tile) === index;
                        });
                        // select closest one to connect
                        landOhoi = landOhoi.sort(function(land1, land2) {
                            // select closest land
                            return distanceBetweenPoints(land1, startingPoint) -
                                distanceBetweenPoints(land2, startingPoint);
                        });

                        // store the islands seen by this bubble so
                        // if there are more same length routes, the one that
                        // sees more land is weighted higher
                        // bubble.getRouteWeight = function() {
                        //     return nextLand.length;
                        // };

                        var center;
                        if (nextLand.length >= 2) {
                            // calculate the approximate direction based on the
                            // gravity center between startingPoint and 2 islands
                            // select the gravity point that deviates the least from closest landOhoi
                            var gravityOffset;
                            for (var i = 0; i < nextLand.length; i++) {
                                for (var ii = 0; ii < nextLand.length; ii++) {
                                    if (i !== ii &&
                                        !tileBelongsToIsland(nextLand[i], landOhoi[0].island) &&
                                        !tileBelongsToIsland(nextLand[ii], landOhoi[0].island)) {
                                        var g
                                        if (self.routeMode === 1) {
                                            g = gravityCenter([startingPoint, nextLand[i],
                                                nextLand[ii]
                                            ]);
                                        } else {
                                            g = gravityCenter([nextLand[i], nextLand[ii]]);
                                        }
                                        var d = distanceBetweenPoints(landOhoi[0], g);
                                        if (!gravityOffset || d < gravityOffset) {
                                            gravityOffset = d;
                                            center = g;
                                        }
                                    }
                                }
                            }
                        }
                        if (!center) {
                            if (self.routeMode === 1) {
                                center = gravityCenter([startingPoint].concat(nextLand.slice(0,
                                    2)));
                            } else {
                                center = gravityCenter(nextLand.slice(0, 2));
                            }
                        }
                        bubble.getDirection = function() {
                            return center;
                        };
                        bubble.getRouteWeight = function() {
                            var d = distanceBetweenPoints(landOhoi[0], center);
                            return d * -1;
                        };

                        // simple case when only 1 option where to connect
                        // replace last level with lastSeaTile and add land
                        if (lastSeaTile) {
                            bubble.pop()
                            bubble.push([lastSeaTile]);
                            bubble.push([landOhoi[0]]);
                            return bubble;
                        }
                        if (landOhoi.length === 1) {
                            bubble.push([landOhoi[0]]);
                            return bubble;
                        }

                        bubble.push([landOhoi[0]]);
                        return bubble;
                    }
                    if (nextLevel.length === 0) {
                        // nothing else found, we must be in a lake
                        return [];
                    }
                    bubble.push(nextLevel);
                    return buildBubble(bubble);
                }

                var burstBubble = function(bubble) {
                    // contruct route backwards. last level in bubble contains the land
                    // dont include it, but use it to backtrack
                    var route = [];
                    if (bubble.length === 0) {
                        // this in case we don't have a bubble
                        return route;
                    }
                    var point = bubble.pop()[0];
                    var center = bubble.getDirection();
                    bubble.reverse().forEach(function(level) {
                        // get the point that is closest to gravity center
                        next = level.filter(function(nextPoint) {
                            return Math.abs(nextPoint.y - point.y) <= 1 &&
                                Math.abs(nextPoint.x - point.x) <= 1;
                        }).sort(function(land1, land2) {
                            return distanceBetweenPoints(land1, center) -
                                distanceBetweenPoints(land2, center);
                        })[0];
                        point = next;
                        route.push(next);
                    });
                    // last is always the starting land point, dont include that
                    route.pop();
                    // pass the amount of connections from bubble to the route
                    route.amountOfConnections = bubble.amountOfConnections;
                    // pass the weight of this route from bubble
                    route.getRouteWeight = bubble.getRouteWeight;
                    return route;
                };
                //canvas.fillCell(land.y, land.x, "white");
                return burstBubble(buildBubble([
                    [land]
                ]));
            };

            var connectNextIsland = function() {
                // get smallest (first) island from sorted islands
                var isle = this.islands[0];
                var routes = [];
                console.log("Connect next island");

                // loop the shore tiles of this island
                for (var i = 0; i < isle.length; i++) {
                    var tile = isle[i];
                    if (tile.isShore) {
                        routes.push(findRouteToNextLand(tile, isle));
                    }
                }

                routes = routes.filter(function(route) {
                    // remove routes that lead nowhere
                    return route.length > 0;
                }).sort(function(r1, r2) {
                    // if same length, higher weight is first
                    if (r1.length === r2.length) {
                        return r2.getRouteWeight() - r1.getRouteWeight();
                    }
                    // sort so shortest is first
                    return r1.length - r2.length;
                });

                // select route with most connections from shortest routes
                var shortest = routes[0].length;
                routes = routes.filter(function(route) {
                    return route.length === shortest;
                }).sort(function(r1, r2) {
                    return r2.amountOfConnections() - r1.amountOfConnections();
                });
                // here is the route
                shortest = routes[0];

                // island that is connected to the backwards route
                var connectedLand = shortest[0].getTilesAround().filter(function(tile) {
                    return tile.isLand && !tileBelongsToIsland(tile, isle);
                })[0];
                connectedLand = this.islands.find(function(island) {
                    return tileBelongsToIsland(connectedLand, island);
                })

                // connect all islands along the route, remove them from list
                // and create new continent
                var landAlongRoute = [];
                shortest.forEach(function(routeTile) {
                    landAlongRoute = landAlongRoute.concat(routeTile.getTilesAround().filter(
                        function(around) {
                            return around.isLand;
                        }));
                });

                // Fill the shortest route
                canvas.fillCells(shortest, "hotpink");
                for (var i = 0; i < shortest.length; i++) {
                    shortest[i].isAdded = true;
                    shortest[i].isLand = true;
                }

                // find islands that are to be connected
                var connectedIslands = []
                for (var i = 0; i < landAlongRoute.length; i++) {
                    var land = landAlongRoute[i];
                    var connectedIsland = this.islands.find(function(connectableIsland) {
                        return connectableIsland.some(function(islandTile) {
                            return islandTile.isSameTile(land);
                        });
                    });
                    connectedIslands.push(connectedIsland);
                }
                // remove duplicate islands
                connectedIslands = connectedIslands.filter(function(isle, index, array) {
                    return array.indexOf(isle) === index;
                });

                // remove old islands
                this.islands = this.islands.filter(function(oldIsland) {
                    // it is contained in connectedIslands
                    var isConnected = connectedIslands.some(function(maybeConnected) {
                        return maybeConnected[0].isSameTile(oldIsland[0]);
                    });
                    return !isConnected;
                });
                var newIsland = shortest;

                // add island and route to connected land and put to island list
                for (var i = 0; i < connectedIslands.length; i++) {
                    newIsland = newIsland.concat(connectedIslands[i]);
                }
                // clear around cache and set island cache
                newIsland.forEach(function(tile) {
                    tile.around = undefined;
                    tile.island = newIsland;
                });
                this.islands.push(newIsland);

                // sort the Islands
                this.sortIslands();
            }

            return new Promise(function(resolve) {
                var connectLoop = function() {
                    if (this.islands.length > 1) {
                        // connect it
                        connectNextIsland.bind(this)();
                        setTimeout(connectLoop, 1);
                    } else {
                        resolve(this.getAddedTiles());
                    }
                }.bind(this)
                connectLoop();
            }.bind(this));

            return done;
        },
        getAddedTiles: function() {
            var added = [];
            for (var i = 0; i < this.map.length; i++) {
                for (var y = 0; y < this.map[i].length; y++) {
                    if (this.map[i][y].isAdded) {
                        added.push(this.map[i][y]);
                    }
                }
            }
            return added;
        }
    }
    return Puzzle;
});
