import * as request from 'request';

const priceKey = '1. open';

const KEY = 'R1SIBTNQMJC7X6NL';
const symbol = 'UMH';
const interval = '1min';
const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&outputsize=full&symbol=${symbol}&interval=${interval}&apikey=${KEY}`;

console.log(url);

interface historicShare {
    price: number;
    timestamp: Date;
}

interface Purchase {
    amount: number;
    price: number;
    timestamp: Date;
}

class Stock {
    key: string;
    purchases: Purchase[];
    oldPurchases: Purchase[];
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
        this.purchases = [];
        this.oldPurchases = [];
        this.getMoney = getMoney;
        this.addToMoney = addToMoney;
    }

    incoming(price: number) {
        if (this.shouldBuy(price)) {
            this.buy(this.howManySharesToBuy(price), price);
        }

        var i = this.purchases.length;
        while (i--) {
            const purchase = this.purchases[i];
            if (this.shouldSell(purchase, price)) {
                const sold = this.sell(purchase, price);
                if (sold) {
                    this.purchases.splice(i, 1);
                }
            }
        }

        this.lastSeenPrice = price;
    }

    shouldBuy(price: number): boolean {
        return this.getPercentageChange(this.lastBoughtInPrice, price) > -2;
    }

    shouldSell(purchase: Purchase, price: number): boolean {
        return this.getPercentageChange(purchase.price, price) > 2;
    }

    sell(purchase: Purchase, price: number): boolean {
        this.oldPurchases.push(purchase);
        this.addToMoney(purchase.amount * price);
        return true;
    }

    howManySharesToBuy(price: number): number {
        return Math.floor(this.getMoney() / price);
    }

    buy(sharesToBuy: number, price: number) {
        this.purchases.push({
            amount: sharesToBuy,
            price: price,
            timestamp: new Date()
        });
        this.lastBoughtInPrice = price;

        this.addToMoney(-(sharesToBuy * price));
    }

    getPercentageChange(oldNumber: number, newNumber: number) {
        return ((newNumber - oldNumber) / oldNumber) * 100.0;
    }

    getUnsoldPrice(): number {
        return this.purchases
            .map(x => x.amount * x.price)
            .reduce((x, y) => x + y);
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

    console.log(session.money, session.stocks.get(symbol).getUnsoldPrice());
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
