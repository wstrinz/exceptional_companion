window.dbOperations = {
  updateOrIgnoreBranch: function(dbBranch, scraped) {
    if (dbBranch.isTerminal) {
      return dbOperations.handleExistingTerminalBranch(dbBranch, scraped);
    }
    else if(scraped.isSocial){
      if(dbBranch.isSocial){
        console.log("ignoring social matching branch");
      }
      else{
        dbBranch.isSocial = true

        return branchDb.put(dbBranch).then(function(resp) {
          return console.log('updated branch to be social', resp);
        })["catch"](function(err) {
          return console.log('failed to update branch!', err);
        });
      }
    }
    else {
      return console.log('ignoring possibly different non-result branch for now', scraped);
    }
  },

  handleExistingTerminalBranch: function(dbBranch, scraped){
    var equivName, existingResult, mergeResult, newResults;
    equivName = function(b) {
      return b.title === scraped.results[0].title;
    };

    existingResult = _.find(dbBranch.results, equivName);
    if (!existingResult) {
      return dbOperations.scrapeNewBranch(scraped, dbBranch)
    }
    else{
      return dbOperations.mergeExistingBranch(dbBranch, scraped)
    }
  },

  scrapeNewBranch: function(scraped, dbBranch){
    console.log('added new result', scraped.results[0]);
    dbBranch.results = dbBranch.results.concat(scraped.results);
    dbBranch.isSocial = scraped.isSocial;
    return branchDb.put(dbBranch).then(function(resp) {
      return console.log('updated branch', resp);
    })["catch"](function(err) {
      return console.log('failed to update branch!', err);
    });
  },

  mergeExistingBranch: function(dbBranch, scraped){
    newResults = _.map(dbBranch.results, function(r) {
      if (_.filter(dbBranch.results, function(r) {
        return r.type === scraped.results[0].type;
      })) {
        return dbOperations.mergeResult(r, scraped.results[0]);
      } else {
        return r;
      }
    });
    dbBranch.results = newResults;
    return branchDb.put(dbBranch).then(function(resp) {
      return console.log('updated known result', scraped.results[0], newResults);
    })["catch"](function(err) {
      return console.log('failed to update known branch!', err);
    });
  },

  mergeResult: function(r1, r2) {
      var cloneR, newItems;
      cloneR = _.cloneDeep(r1);
      cloneR.items = _.map(cloneR.items, function(i) {
        var inR2;
        inR2 = _.find(r2.items, function(i2) {
          return i2.name === i.name;
        });
        if (!(_.isArray(i.count))) {
          i.count = [i.count, i.count];
        }
        i.count = _.map(i.count, function(c) {
          if (_.isString(c)) {
            return parseInt(c);
          } else {
            return c;
          }
        });
        if (inR2) {
          if (_.isArray(i.count)) {
            if (i.count[0] > inR2.count[0]) {
              i.count[0] = inR2.count[0];
            } else if (i.count[1] < inR2.count[1]) {
              i.count[1] = inR2.count[1];
            }
          }
        }
        return i;
      });
      newItems = _.filter(r2.items, function(newI) {
        return !(_.any(cloneR.items, function(oldI) {
          return oldI.name === newI.name;
        }));
      });
      cloneR.items = cloneR.items.concat(newItems);
      cloneR.qualities = _.filter(cloneR.qualities, function(q) {
        return _.isObject(q);
      });
      cloneR.qualities = cloneR.qualities.concat(_.filter(r2.qualities, function(newQ) {
        return !(_.any(cloneR.qualities, function(oldQ) {
          return oldQ.quality === newQ.quality;
        }));
      }));
      return cloneR;
    },

};

window.dbQueries = {
  eventsForBranch: function(branchId) {
    return _.filter(storyDB.events, function(evt) {
      return _.includes(evt.branches, String(branchId));
    });
  },
  showBranch: function(id) {
    return branchDb.get(String(id)).then(function(result) {
      return console.log(result);
    })["catch"](function(err) {
      return console.log('didnt find branch', err);
    });
  },
  showEvent: function(id) {
    return eventDb.get(String(id)).then(function(result) {
      return console.log(result);
    })["catch"](function(err) {
      return console.log('didnt find event', err);
    });
  },
  resultExists: function(table, resultType) {
    var dbObj;
    dbObj = storyDB[table];
    if (dbObj) {
      return _.any(dbObj.results, 'type', resultType);
    } else {
      return false;
    }
  },
  branchesWithItem: function(item) {
    return branchDb;
  },
  resultKnown: function(resultsList, newResult) {
    var equivNew;
    equivNew = function(extant) {
      return extant.type === newResult.type;
    };
    return _.any(resultsList, equivNew);
  },
  searchFor: function(target, nToShow) {
    nToShow = nToShow || 3;
    var hasItem = function(result, target, direction){
      direction = direction || "gained";
      return _.any(result.items, function(i){
        return (i.name == target && i.direction == "gained");
      })
    }

    var itemAmt = function(branch, target, direction){
      direction = direction || "gained";
      res = _.find(branch.results, function(res){ return hasItem(res, target, direction) })
      return _.find(res.items, function(i){
        return (i.name == target && i.direction == direction);
      }).count[1]
    }

    branchDb.query(function (doc, emit) {
      if(_.any(doc.results, function(r){ return hasItem(r, target)})){
        /* emit(itemAmt(doc, target)); */
        emit(true);
      } else {
        /* emit(0); */
        emit(false);
      }

    }, {key: true, include_docs: true}).then(function (result) {
      if(result.rows.length == 0){
        console.log('none found');
      }
      else {
        best = _.sortBy(result.rows, function(r){ return itemAmt(r.doc, target) }).reverse()

        _.each(_.range(nToShow), function(i) {
          if(best[i])
          console.log('#' + i + ' best: ' + itemAmt(best[i].doc, target), best[i].doc);
        })
      }

    }).catch(function (err) {
      console.log('err', err)
    });
  },
  resultsForEvent: function(eventId) {
    var itemsDescString, makeResultsObj, qualitiesDescString;
    itemsDescString = function(items) {
      return _.map(items, function(i) {
        return i.name + " (" + i.count[0] + " - " + i.count[1] + ")";
      });
    };
    qualitiesDescString = function(qualities) {
      return _.map(qualities, function(q) {
        return q.quality + " (" + q.direction + ")";
      });
    };
    makeResultsObj = function(resultList) {
      return _.reduce(resultList, function(acc, result) {
        if (!acc[result.title]) {
          acc[result.title] = {};
        }
        if (acc[result.title][result.type]) {
          acc[result.title][result.type].items = acc[result.name][result.type].items + itemsDescString(result.items).join("<br>");
          acc[result.title][result.type].qualities = acc[result.name][result.type].qualities + qualitiesDescString(result.qualities).join("<br>");
        } else {
          acc[result.title][result.type] = {
            items: itemsDescString(result.items).join("<br>"),
            qualities: qualitiesDescString(result.qualities).join("<br>")
          };
        }
        return acc;
      }, {});
    };
    return new Promise(function(mainRes, mainRej) {
      return eventDb.get(eventId).then(function(dbEvt) {
        var branchPromises;
        branchPromises = _.map(dbEvt.branches, function(br) {
          return new Promise(function(resi, reji) {
            return branchDb.get(br).then(function(dbBranch) {
              var branchDesc;
              branchDesc = fl.annotator.branchAttrs.shortDesc(dbBranch);
              return resi(dbBranch);
            }, function(err) {
              return resi(void 0);
            });
          });
        });
        return Promise.all(branchPromises).then(function(branches) {
          return mainRes(JSON.stringify(_.map(_.compact(branches), function(b) {
            return makeResultsObj(b.results);
          }), null, 2).replace(/\\n/g, "<br>").replace(" ", "&nbsp;"));
        }, function(err) {
          console.log('item scraper rejected?', err);
          return mainRes("Error");
        });
      });
    });
  }
};
