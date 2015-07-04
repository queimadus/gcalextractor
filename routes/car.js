var express = require('express');
var router = express.Router();
var exec = require('child_process').exec;
var tsv = require('tsv');
var _ = require('underscore');

const script = "gcalcli --nocolor --tsv agenda --calendar Car '1-1-2014' 'now'"

router.get('/', function(req, res, next) {
  exec(script, (error, stdout, stderr) => {
    if (error) {
      console.log("STDERR: " + stderr);
      res.status(500).send(stderr);
      return;
    }

    const header = "start_date\tstart_hour\tend_date\tend_hour\ttext\n";
    const t = tsv.parse(header + stdout.replace(/\n$/, ""));

    function isKm(text) { return text.match(/^km/i); }
    function isGas(text) { return text.match(/^gas/i); }

    const car = _.chain(t)
      .filter(line => line.text.match(/^(km|gas)/i))
      .map(line => {
        return { date: line.start_date, text: line.text };
      })
      .map(line => {
        var km, gas, price;
        if (isKm(line.text)) {
          km = line.text.match(/km (.*)/im)[1];
        } else if (isGas(line.text)) {
          var d = line.text.match(/gas (\d+\.?\d*)L? - +(\d+\.?\d*)€?/im);
          if (d) { gas = d[1]; price = d[2]; }
        }
        return { date: line.date, km: km, gas: gas, price: price };
      })
      .groupBy(x => x.date)
      .map(grouped => {
        return _.reduce(grouped, (acc, d) => {
          return _.mapObject(acc, (value, key) => value || d[key]);
        });
      })
      .value();

    res.set('Content-Type', 'text/tab-separated-values');
    res.send(tsv.stringify(car));
  });
});

module.exports = router;
