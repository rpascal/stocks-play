var request = require('request');

const priceKey = '1. open';

const KEY = 'R1SIBTNQMJC7X6NL';
const symbol = 'UMH';
const interval = '1min';
const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&outputsize=full&symbol=${symbol}&interval=${interval}&apikey=${KEY}`;

console.log(url);


class Stock {
    // money;
    // symbol;
    // amountOwned;

    constructor(symbol) {
        this.symbol = symbol;
        this.money = 1000;
        this.amountOwned = 0;
    }



    numCanBuy(price) {
        return Math.floor(this.money / price);
    }

    buy(amount, price) {
        this.amountOwned = amount;
        this.money -= amount * price;
    }

    sell(amount, price) {
        this.money += amount * price;
        this.amountOwned -= amount;
    }

    sellAll(price) {
        this.sell(this.amountOwned, price);
    }


}

request(url, function (error, response, body) {
    // Oldest first in array
    const dataArray = parseResponse(body);

    let boughtInPrice;
    let soldAtPrice;
    let lastValue;


    let stock = new Stock(symbol);

    dataArray.forEach((item, i) => {
        const curPrice = item.price;

        if (i == 0) {
            boughtInPrice = curPrice;
            stock.buy(stock.numCanBuy(curPrice), curPrice);
        }

        const percentChage = getPercentageChange(boughtInPrice, curPrice);

        if (percentChage > 2 && stock.amountOwned > 0) {
            stock.sellAll(curPrice);
            soldAtPrice = curPrice;
            console.log(soldAtPrice);
        }

        if (soldAtPrice && stock.amountOwned == 0 && getPercentageChange(soldAtPrice, curPrice) < -1) {
            stock.buy(stock.numCanBuy(curPrice), curPrice);
            boughtInPrice = curPrice;
        }

        lastValue = curPrice;
    });

    console.log(
        stock.money,
        boughtInPrice,
        lastValue,
        dataArray[0].timestamp,
        dataArray[dataArray.length - 1].timestamp
    );
});

function getPercentageChange(oldNumber, newNumber) {
    return ((newNumber - oldNumber) / oldNumber) * 100.0;
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
                price: parseFloat(content[priceKey]),
                timestamp: new Date(key)
            });
        }
    }

    return dataArray.sort(function (a, b) {
        return a.timestamp - b.timestamp;
    });
}