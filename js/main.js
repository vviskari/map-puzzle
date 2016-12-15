requirejs.config({
    paths: {
        text: '../lib/text',
        underscore: '../lib/underscore-min',
        json: '../lib/require/json',
        bluebird: '../lib/bluebird.min'
    }
});

requirejs(['storage', 'puzzle', 'canvas', 'bluebird'], function(storage, puzzle, canvas, Promise) {

    //canvas.skipRender = true;
    var m1 = 1;
    var m2 = 10;
    var mapPromises = [];

    console.log("Starting to resolve maps from", m1, "to", m2);
    for (var i = m1; i <= m2; i++) {
        mapPromises.push(storage.loadLocalMap(i));
    }

    Promise.reduce(mapPromises,
            function(results, map) {
                var s = new Date();
                puzzle.loadMap(map.map);
                puzzle.parseIslands();
                //  puzzle.colorIslands();
                puzzle.routeMode = 1;
                // puzzle.connectIslands();
                // var result1 = puzzle.getAddedTiles().map(function(tile) {
                //     return [tile.y, tile.x];
                // });
                // // then try another route method
                // puzzle.loadMap(map.map);
                // puzzle.parseIslands();
                // puzzle.routeMode = 2;
                return puzzle.connectIslands().then(function(addedTiles) {
                    var result = addedTiles.map(function(tile) {
                        return [tile.y, tile.x];
                    });
                    var time = new Date().getTime() - s.getTime();
                    result = {
                        result: result,
                        seed: map.seed,
                        time: time,
                        score: (7000 - result.length) / 1000
                    };
                    console.log("Map", map.seed, ",", time, "ms", ",Score:", result.score, ",Tiles:",
                        result.result.length);
                    results.push(result);
                    return results;
                });
            }, [])
        .then(function(results) {
            // for each map sum(7000 - s)/1000
            var score = 0;
            for (var i = 0; i < results.length; i++) {
                score += results[i].score;
            }
            console.log("SCORE: ", score);
            return results;
        });
});
