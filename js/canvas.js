define(function() {

    var cellSize = 8;
    var canvasElement = document.querySelector('canvas');
    var ctx = canvasElement.getContext('2d');

    var canvas = {
        LAND: "#55BB00",
        SEA: "#0077CC",
        SHOW: "#ff0000",
        initMap: function(map) {
            if (this.skipRender) return;

            var dimensionY = map.length;
            var dimensionX = map[0].length;
            var width = dimensionX * cellSize;
            var height = dimensionY * cellSize;

            ctx.canvas.width = width;
            ctx.canvas.height = height;
            ctx.strokeStyle = "#009";

            for (var y = 0; y < dimensionY; y++) {
                for (var x = 0; x < dimensionX; x++) {
                    if (map[y][x].isLand) {
                        this.fillCell(y, x, this.LAND);
                    } else {
                        this.fillCell(y, x, this.SEA);
                    }
                }
            }
            ctx.stroke();
        },
        fillCell: function(ycell, xcell, color) {
            if (this.skipRender) return;
            if (!color) {
                color = "#FFFFFF";
            }
            var y = ycell * cellSize;
            var x = xcell * cellSize;
            ctx.fillStyle = color;
            ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
            ctx.stroke();
        },
        fillCells: function(cells, color) {
            if (this.skipRender) return;

            for (var i = 0; i < cells.length; i++) {
                this.fillCell(cells[i].y, cells[i].x, color);
            }
        },
        resetCells: function(cells) {
            if (this.skipRender) return;

            var self = this;
            cells.forEach(function(cell) {
                if (cell.isLand) {
                    self.fillCell(cell.y, cell.x, self.LAND);
                } else {
                    self.fillCell(cell.y, cell.x, self.SEA);
                }
            });
        },
        getUrl:function(){
            return canvasElement.toDataURL("image/png");
        }
    }
    return canvas;
});
