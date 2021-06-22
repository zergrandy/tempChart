
var mod = 0;
var orderInfoAry = [];
var orderObjAry = [];
var orderObjAryAll = [];
var profitObjAryAll = [];




//讀取多個文字檔
function readmultifiles(files) {
    var reader = new FileReader();
    function readFile(index) {
        if (index >= files.length) return;
        var file = files[index];
        reader.onload = function (e) {
            // get file content  
            var lineTxt = e.target.result;
            console.log(lineTxt);
            processFile(lineTxt);



            readFile(index + 1)
        }
        reader.readAsText(file);
    }
    readFile(0);
}

//讀取單一文字檔
function processFile(lineTxt) {
    results = lineTxt.split("\r\n");

    for (var i = 0; i < results.length; i++) {
        var result = results[i];

        mod = checkIsInit(result, mod);
        if (mod == -1) {
            //程式重新啟動
            //TODO 需要把之前的艙位都視為平倉出場
            orderObjAryAll.push(orderObjAry);
            orderObjAry = [];
            mod = 0;
        }

        if (mod == 0) {
            mod = getmodifyFileName(result, mod);
        }
        if (mod == 1) {
            mod = isDup(result, mod);
        }
        if (mod == 2) {
            mod = SkipThisOrder(result, mod);
        }
        if (mod == 3) {
            mod = startOrder(result, mod);
        }
        if (mod == 4) {
            mod = checkOrderSuccess(result, mod);
        }
        if (mod == 5) {
            orderInfoAry.push(result);
            var mod;
            var balance;
            mod, balance = checkOrderEnd(result, mod);
            if (mod == 0) {
                var orderObj = buildOrderObj(orderInfoAry);
                orderObjAry.push(orderObj);
                orderInfoAry = [];
            }
        }
    }

    //這邊要算出當前為止的勝率，統計當前為止的餘額，統計當前為止的獲利


}

//讀取文字行後的判斷，判斷現在處於哪一個階段
function checkIsInit(textRow, mod) {
    if (textRow.includes("開始監控")) {
        mod = -1;
    }
    return mod;
}

function getmodifyFileName(textRow, mod) {
    if (textRow.includes("被異動的檔名為：")) {
        var AlphaName = textRow.replace("被異動的檔名為：", "").replace(".txt", "");
        var temp = AlphaName.split("INFO  ", "");
        console.log(temp);
        mod++;
    }
    return mod;
}

function isDup(textRow, mod) {
    if (textRow.includes("isDup: ")) {
        var tempAry = textRow.split("isDup:");
        var tof = tempAry[1];

        console.log(tof);
        if (tof == "True") {//跳過這次
            return 0;
        }
        mod++;
    }
    return mod;
}

function SkipThisOrder(textRow, mod) {
    if (textRow.includes("TempBool: SkipThisOrder: ")) {
        var tempAry = textRow.split("TempBool: SkipThisOrder: ");
        var tof = tempAry[1];

        console.log(tof);
        if (tof == "True") {//跳過這次
            return 0;
        }
        mod++;
    }
    return mod;
}

function startOrder(textRow, mod) {
    if (textRow.includes("文字檔參數")) {
        var tempAry = textRow.split("文字檔參數 ");
        var paras = tempAry[1];

        console.log(paras);
        mod++;
    }
    return mod;
}

function checkOrderSuccess(textRow, mod) {
    if (textRow.includes("成功")) {
        //var tempAry =  textRow.split("成功");
        //var paras = tempAry[1];

        mod++;
    }
    return mod;
}

function checkOrderEnd(textRow, mod) {
    console.log(textRow);
    var balance = 0;
    if (textRow.includes("餘額")) {
        balance = textRow.split(": ")[1];
        mod = 0;
    }
    return mod, balance;
}

//組件下單物件
function buildOrderObj(orderInfoAry) {
    var fileName = orderInfoAry[1].split(" : ")[1];
    var strategyType = orderInfoAry[2].split(" : ")[1];
    var symbol = orderInfoAry[3].split(" : ")[1];
    var side = orderInfoAry[4].split(" : ")[1];
    var origQty = orderInfoAry[5].split(" : ")[1];
    var priceExpect = orderInfoAry[6].split(" : ")[1];
    var dtExpect = orderInfoAry[7].split(" : ")[1];
    var avgPrice = orderInfoAry[8].split(" : ")[1];
    var dtBack = orderInfoAry[9].split(" : ")[1];
    var stopPrice = orderInfoAry[10].split(" : ")[1];
    //var stopQty = orderInfoAry[11].split(" : ")[1];
    var orderObj = {
        fileName: fileName,
        strategyType: strategyType,
        symbol: symbol,
        side: side,
        origQty: origQty,
        priceExpect: priceExpect,
        dtExpect: dtExpect,
        avgPrice: avgPrice,
        dtBack: dtBack,
        stopPrice: stopPrice,
        //stopQty : stopQty,
    };
    return orderObj;
}


//用下單物件列表，算出獲利物件
function calc(orderObjAry) {

    var openList = [];
    var profitObjAry = [];

    orderObjAry.forEach(element => {
        var fileNameThis = element.fileName;
        var strategyType = element.strategyType;

        if (strategyType == "建倉") {
            openList = open(openList, element);
        } else if (strategyType == "平倉") {
            openList, profitObj = close(openList, element);
            profitObjAry.push(profitObj);
        } else if (strategyType == "建倉(翻單)") {
            openList, profitObj = flip(openList, element);
            profitObjAry.push(profitObj);
        }
    });

    return profitObjAry;
}

function flip(openList, elementEnd) {
    var openListNew = [];

    var fileNameThis = elementEnd.fileName;
    var newOpenQty = 0;
    var profitObj;

    //close
    openList.forEach(elementStart => {
        if (elementStart.fileName == fileNameThis) {//找到符合的平倉單了

            profitObj = buildProfitObj(elementStart, elementEnd);
            console.log(profitObj);

            newOpenQty = elementEnd.origQty - elementStart.origQty;
        } else {
            openListNew.push(elementStart);
        }
    });

    //open
    elementEnd.origQty = newOpenQty;
    openListNew.push(elementEnd);
    return openListNew, profitObj;
}

function open(openList, elementStart) {
    var openListNew = openList;
    openListNew.push(elementStart);
    return openListNew;
}

function close(openList, elementEnd) {
    var openListNew = [];
    var fileNameThis = elementEnd.fileName;
    var profitObj;

    openList.forEach(elementStart => {
        if (elementStart.fileName == fileNameThis) {//找到符合的平倉單了

            profitObj = buildProfitObj(elementStart, elementEnd);
            console.log(profitObj);

        } else {
            openListNew.push(elementStart);
        }
    });

    return openListNew, profitObj;
}

function buildProfitObj(elementStart, elementEnd) {

    var profit = 0;
    var profitExpect = 0;
    var qty = elementStart.origQty;

    if (elementEnd.side == "SELL") {
        var priceDifExpect = elementEnd.priceExpect - elementStart.priceExpect;
        profitExpect = priceDifExpect * qty * 0.999;

        var priceDif = elementEnd.avgPrice - elementStart.avgPrice;
        profit = priceDif * qty * 0.999;
    } else {
        var priceDifExpect = elementStart.priceExpect - elementEnd.priceExpect;
        profitExpect = priceDifExpect * qty * 0.999;

        var priceDif = elementStart.avgPrice - elementEnd.avgPrice;
        profit = priceDif * qty * 0.999;
    }

    var profitObj = {
        fileName: elementEnd.fileName,
        buySellStart: elementStart.side,
        symbol: elementEnd.symbol,
        qty: elementStart.origQty,
        startPrice: elementStart.avgPrice,
        endPrice: elementEnd.avgPrice,
        startDate: elementStart.dtBack,
        endDate: elementEnd.dtBack,

        startPriceExpect: elementStart.priceExpect,
        endPriceExpect: elementEnd.priceExpect,
        startDateExpect: elementStart.dtExpect,
        endDateExpect: elementEnd.dtExpect,

        profit: profit,
        profitExpect: profitExpect,
    };
    return profitObj;
}




