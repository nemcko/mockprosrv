'use strict';

const { dir } = require('console');

module.exports.useDb = function (config, name) {
    const low = require('lowdb')
    const FileAsync = require('lowdb/adapters/FileAsync')
    const path = require('path')
    const adapter = new FileAsync(path.join(config.rootdir, config.dataDir + '/' + name + '.json'))

    return low(adapter)
}


module.exports.writeHead = function (res) {
    res.writeHead(200, {
        'Content-Type': 'application/json;charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
        "Access-Control-Allow-Headers": "If-Modified-Since"
    });
}

function idName(idname) {
    return idname ? idname : 'id';
}

function idValue(idname, id) {
    return !idname | idname === 'id' ? Number(id) : id;
}

function fingObject(id, idname) {
    return { [idName(idname)]: idValue(idname, id) }
}

module.exports.sendFile = function (res, config, name) {
    var fs = require('fs')
        , path = require('path')
        , data
        ;

    fs.readFile(path.join(config.rootdir, '/data/' + name), 'utf8', function (err, data) {
        if (err) return res.status(500).json({ err: err });

        exports.writeHead(res);

        res.write(data);
        res.end();
    });
}

module.exports.findObjectById = function (db, collection, id, idname = '') {
    return db.get(collection)
        .find({ [idName(idname)]: idValue(idname, id) })
        .value();
}

module.exports.sendObjectById = function (req, res, db, collection, idname = '') {
    var find = module.exports.findObjectById(db, collection, req.params[idName(idname)], idname);
    if (!find) return res.status(500).send('Incorrect ID!');
    res.send(Object.assign({}, find));
};

module.exports.appendObject = function (req, res, db, collection, idname = '') {
    db.get(collection)
        .push(req.body)
        .write()
    res.status(200).send({ status: 'o.k.' });
};

module.exports.saveObjectById = function (req, res, db, collection, idname = '') {
    db.get(collection)
        .find(fingObject(idValue(idname, req.params[idName(idname)]), idname))
        .assign(req.body)
        .write()
    res.status(200).send({ status: 'o.k.' });
};

module.exports.deleteObjectById = function (req, res, db, collection, idname = '') {
    db.get(collection)
        .remove(fingObject(idValue(idname, req.params[idName(idname)]), idname))
        .write()
    res.status(200).send({ status: 'o.k.' });
};

module.exports.list = function (req, res, db, collection) {
    const result = {
        "result": [],
        "total": 0
    }
    db.get(collection).value().forEach(item => {
        result.result.push(Object.assign({}, item));
        result.total++;
    })
    res.send(result)
}

/**
 * browseList: Listing of mockup items
 * @param req           - request objekt
 * @param res           - response objekt
 * @param db            - json database
 * @param collection    - name of collection
 * @param fields        - fields in listing
 * @param filtermap     - object for mapping filter fields to database fields
 * @param resfn         - function for mapping result fields to response
 */
module.exports.browseList = function (req, res, db, collection, fields = '', filtermap = null, resfn = null) {
    const result = {
        "result": [],
        "total": 0
    }

    let isObject = (a) => {
        return (!!a) && (a.constructor === Object);
    };

    let objProPath = (propath, obj) => {
        return propath.split('.').reduce((a, b) => {
            return a && a[b];
        }, obj);
    }

    let getValue = (item, obj, propath) => {
        let expand = (str, val = {}) => {
            return str.split('.').reduceRight((acc, currentValue) => {
                return { [currentValue]: acc }
            }, val)
        }
        let objVal = (object, keys) => keys.split('.').reduce((o, k) => (o || {})[k], object);
        return expand(propath, objVal(item, propath));
    }


    let findValue = (obj, propName, propValue) => {
        let aProps = Object.getOwnPropertyNames(obj);
        for (let i = 0; i < aProps.length; i++) {
            if (obj[propName] && obj[propName].indexOf(propValue) >= 0) {
                return true;
            }
        }
        return false;
    }

    let matches = (itm, flt) => {
        let filterIsEmpty = true;
        for (let key in flt) {
            filterIsEmpty = false;
            if (!isObject(flt[key])) {
                if (findValue(itm, key, flt[key]) || flt[key] === '') {
                    return true;
                }
            }
        }

        return filterIsEmpty;
    }

    let fmap = (fields ?
        (filtermap ? filtermap :
            fields.split(",").reduce((acc, elem) => {
                acc[elem] = elem
                return acc
            }, {})
        ) : null
    )

    let filterObject;
    if (fmap) {
        let fo = Object.keys(req.body.filter).map(name => {
            return { [fmap[name]]: req.body.filter[name] };
        }).reduce((fobj, item) => {
            return fobj = { ...fobj, ...item };
        }, {});
        filterObject = fo;
    } else {
        filterObject = req.body.filter;
    }

    let query = db.get(collection).value().filter(function (item) {
        return matches(item, filterObject);
    })

    let { start, limit } = req.body;
    let pid = 0;
    start = parseInt(start) + 1;
    limit = parseInt(limit);

    query.forEach(item => {
        ++pid;
        if ((pid > (start - 1) * limit) && (pid <= start * limit)) {
            if (fields) {
                let row = fields.split(",").reduce((itm, fld) => {
                    let val = getValue(item, itm, fld);
                    let temp = Object.assign({}, itm, val)
                    Object.keys(temp).forEach(key => {
                        temp[key] = (typeof temp[key] === 'object') ? Object.assign(temp[key], itm[key], val[key]) : temp[key];
                    })
                    return temp;
                }, {});
                result.result.push(row);
            } else {
                result.result.push(Object.assign({}, item));
            }
        }
        result.total++;
    })
    if (resfn) {
        return resfn(req, res, result);
    } else {
        res.send(result)
    }
};
