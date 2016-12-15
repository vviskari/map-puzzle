define(['json'], function(json) {
    var Storage = {
        loadLocalMap: function(id)  {
            var self = this;

            return new Promise(function(resolve, reject) {
                require(['json!/maps/map-' + id + '.json'],
                    function(map) {
                        resolve({map: map.map, seed: id});
                    });
            });
        }
    };
    return Storage;
});
