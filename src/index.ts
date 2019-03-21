import * as request from 'request';

const priceKey = '1. open';

const KEY = 'R1SIBTNQMJC7X6NL';
const symbol = 'UMH';
const interval = '1min';
const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&outputsize=full&symbol=${symbol}&interval=${interval}&apikey=${KEY}`;

console.log(url);

interface Share {
    boughtPrice: number;
    sold: boolean;
    soldPrice?: number;
}

interface historicShare {
    price: number;
    timestamp: Date;
}

class Stock {
    key: string;
    shares: Share[];
    soldShares: Share[];
    lastBoughtInPrice: number = 0;
    lastSeenPrice: number = 0;

    getMoney: () => number;
    addToMoney: (num: number) => void;

    constructor(
        key: string,
        getMoney: () => number,
        addToMoney: (num: number) => void
    ) {
        this.key = key;
        this.shares = [];
        this.soldShares = [];
        this.getMoney = getMoney;
        this.addToMoney = addToMoney;
    }

    incoming(price: number) {
        if (this.shouldBuy(price)) {
            this.buy(this.howManySharesToBuy(price), price);
        }

        this.shares.forEach(x => {
            if (this.shouldSell(x, price)) {
                this.prepSell(x, price);
            }
        });

        const sharesToSell = this.shares.filter(x => x.sold).length;
        if (sharesToSell > 0) {
            this.sell(sharesToSell, price);
        }

        this.lastSeenPrice = price;
    }

    shouldBuy(price: number): boolean {
        return this.getPercentageChange(this.lastBoughtInPrice, price) > -2;
    }

    shouldSell(share: Share, price: number): boolean {
        return this.getPercentageChange(share.boughtPrice, price) > 2;
    }

    prepSell(share: Share, price: number) {
        share.soldPrice = price;
        share.sold = true;
    }

    sell(sharesToSell: number, price: number) {
        this.soldShares.concat(this.shares.filter(x => x.sold));
        this.shares = this.shares.filter(x => !x.sold);
        this.addToMoney(sharesToSell * price);
    }

    howManySharesToBuy(price: number): number {
        return Math.floor(this.getMoney() / price);
    }

    buy(sharesToBuy: number, price: number) {
        for (let i = 0; i < sharesToBuy; i++) {
            this.shares.push({
                boughtPrice: price,
                sold: false
            });
        }
        this.lastBoughtInPrice = price;

        this.addToMoney(-(sharesToBuy * price));
    }

    getPercentageChange(oldNumber: number, newNumber: number) {
        return ((newNumber - oldNumber) / oldNumber) * 100.0;
    }
}

class StockSession {
    money: number;
    stocks: Map<string, Stock>;

    constructor() {
        this.money = 1000;
        this.stocks = new Map();
    }

    update(key, price) {
        let stock = this.stocks.get(key);
        if (stock === null || stock == undefined) {
            this.stocks.set(
                key,
                new Stock(
                    key,
                    () => {
                        return this.money;
                    },
                    (num: number) => {
                        this.money += num;
                    }
                )
            );
            stock = this.stocks.get(key);
        }

        stock.incoming(price);
    }
}

request(url, function(error, response, body) {
    // Oldest first in array
    const dataArray = parseResponse(body);

    let session = new StockSession();

    dataArray.forEach((item, i) => {
        session.update(symbol, item.price);
    });

    console.log(
        session.money,
        session.stocks.get(symbol).shares.length *
            session.stocks.get(symbol).lastSeenPrice
    );
});

function getPercentageChange(oldNumber, newNumber) {
    return ((newNumber - oldNumber) / oldNumber) * 100.0;
}

function parseResponse(body): historicShare[] {
    const json = JSON.parse(body);
    const data = json[`Time Series (${interval})`];
    const dataArray: historicShare[] = [];

    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            const content = data[key];
            dataArray.push({
                price: parseFloat(content[priceKey]),
                timestamp: new Date(key)
            });
        }
    }

    return dataArray.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
}
