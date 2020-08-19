const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const cliProgress = require('cli-progress');
const table = require('console.table');

const loading = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

const readCsvAsync = (filename) => {
    return new Promise((resolve, reject) => {
        const indexes = [];
        fs.readFile(path.join(__dirname, filename), 'utf-8', (err, data) => {
            if (err) {
                return reject(err);
            }
            
            const rows = data.split(/\r\n|\n/);

            for (const row of rows) {
                indexes.push({
                    index: parseInt(row.split(',')[11]),
                    timestamp: parseInt(row.split(',')[2])
                });
            }

            resolve(indexes);
        });
    });
};
// async wrapper
(async () => {
    const cycles = [];
    console.log('reading csv file...');
    
    const data = await readCsvAsync('data.csv').catch(err => {
        console.log(err);
    });

    // remove header
    data.splice(0, 1);

    // index for each cycle
    for (let d of data) {
        if (d.index === 0) {
            cycles.push({
                index: cycles.length,
                list: []
            });
        }

        if (cycles.length > 0) {
            cycles[cycles.length - 1].list.push(d);
        }
        
    }

    const retrieved = [];
    for (const cycle of cycles) {
        retrieved.push({
            index: cycle.index,
            size: cycle.list.length,
            start: (new Date(cycle.list[0].timestamp)).toString().split(' ').splice(0, 5).join(' '),
            end: (new Date(cycle.list[cycle.list.length - 1].timestamp)).toString().split(' ').splice(0, 5).join(' ')
        });
    }

    console.log('Retrieved data');
    console.log(table.getTable(retrieved));

    // get repeating indexes
    const repeat = [];

    loading.start(cycles.length, 0);
    for (const cycle of cycles) {
        
        for (const data of cycle.list) {
            const t = cycle.list.filter(a => {
                return a.index === data.index;
            });

            if (t.length > 1) {
                let r = repeat.find(a => {
                    return a.index === cycle.index;
                });
                
                if (!r) {
                    repeat.push({
                        index: cycle.index,
                        size: cycle.list.length,
                        list: []
                    });

                    r = repeat[repeat.length - 1];
                }
                
                const h = r.list.find(a => {
                    return a.index === t[0].index;
                });
                if (!h) {
                    r.list.push({
                        index: data.index,
                        count: t.length,
                        timestamps: []
                    });

                    for (const f of t) {
                        r.list[r.list.length - 1].timestamps.push((new Date(f.timestamp)).toString().split(' ').splice(0, 5).join(' '));
                    }
                }

                
            }

        }
        loading.increment();
        
    }
    loading.stop();

    x = 0;
    const res = [];
    for (const r of repeat) {
        for (const l of r.list) {
            res.push({
                cycleIndex: r.index,
                cycleSize: r.size,
                atIndex: l.index,
                count: l.count,
                at: l.timestamps.join(', ')
            });
        }
        
    }

    console.log(table.getTable(res));
})();
