var request = require('request');

const KEY = "R1SIBTNQMJC7X6NL";
const symbol = "UMH";
const interval = "5min";

const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&outputsize=full&symbol=${symbol}&interval=${interval}&apikey=${KEY}`;
console.log(url);
request(url, function (error, response, body) {

    // Oldest first in array
    const dataArray = parseResponse(body);

    let money = 1000;

    let boughtInPrice;
    let soldAtPrice;
    let numBought;
    let lastValue;


    dataArray.forEach((item, i) => {
        const currentValue = parseFloat(item["1. open"]);
        if (i == 0) {
            boughtInPrice = currentValue;

            numBought = Math.floor(money / boughtInPrice);
            money = money - (numBought * currentValue);
        }

        const percentChage = getPercentageChange(boughtInPrice, currentValue);
        if (percentChage > 2) {
            money = money + (numBought * currentValue);
            soldAtPrice = currentValue;
            numBought = 0;
            console.log(currentValue, percentChage);
        }

        const percentChageSold = getPercentageChange(soldAtPrice, currentValue);
        if (numBought == 0 && percentChageSold < -2) {
            numBought = Math.floor(money / boughtInPrice);
            money = money - (numBought * currentValue);
            boughtInPrice = currentValue;
        }


        lastValue = currentValue;
    })


    console.log(money, numBought, boughtInPrice, lastValue, numBought*lastValue);

});

function getPercentageChange(oldNumber, newNumber) {
    var decreaseValue = oldNumber - newNumber;

    return (decreaseValue / oldNumber) * 100;
}

function parseResponse(body) {
    const json = JSON.parse(body);

    const data = json[`Time Series (${interval})`];


    const dataArray = [];

    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            const content = data[key];
            dataArray.push({
                ...content,
                timestamp: new Date(key)
            })

        }
    }

    return dataArray.sort(function (a, b) {
        return a.timestamp - b.timestamp;
    });;
}