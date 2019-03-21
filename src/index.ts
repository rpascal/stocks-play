import * as request from 'request';

const priceKey = '1. open';

const KEY = 'R1SIBTNQMJC7X6NL';
const symbol = 'UMH';
const interval = '1min';
const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&outputsize=full&symbol=${symbol}&interval=${interval}&apikey=${KEY}`;

console.log(url);

interface Share{
    price: number;
    stocks: Stock[];
}

interface Stock {
    price: number;
    date: Date;
    symbol: string;
}

class StockSession {
    money: number;
    stocks: Stock[];
    get stocksOwned() {
        return this.stocks.length;
    }

    constructor() {
        this.money = 1000;
        this.stocks = [];
    }

    numCanBuy(price) {
        return Math.floor(this.money / price);
    }

    buy(stock: Stock) {
        this.stocks.push(stock);
        this.money -= stock.price;
    }

    buyMax(stock: Stock) {
        const canBuy = this.numCanBuy(stock.price);
        for (let i = 0; i < canBuy; i++) {
            this.buy(stock);
        }

    }

    sell(stock: Stock) {
        this.stocks.filter(item => item != stock);
        this.money += stock.price;
    }

    sellAll(price) {
        this.stocks.forEach(item)
        this.sell(this.amountOwned, price);
    }
}

request(url, function(error, response, body) {
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

        if (
            soldAtPrice &&
            stock.amountOwned == 0 &&
            getPercentageChange(soldAtPrice, curPrice) < -1
        ) {
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

function parseResponse(body): Stock[] {
    const json = JSON.parse(body);
    const data = json[`Time Series (${interval})`];
    const dataArray: Stock[] = [];

    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            const content = data[key];
            dataArray.push({
                price: parseFloat(content[priceKey]),
                date: new Date(key),
                symbol: this.symbol
            });
        }
    }

    return dataArray.sort((a, b) => a.date.getTime() - b.date.getTime());
}
