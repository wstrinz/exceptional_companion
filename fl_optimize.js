/* global $ */

String.prototype.trim = function()
{
  return String(this).replace(/^\s+|\s+$/g, '');
};

var fl = {
  util: {
    clone: function (obj) {
      return JSON.parse(JSON.stringify(obj));
    },
    iShift: function (obj) {
      var n = this.clone(obj);
      n.shift();
      return n;
    },

    waitForAjax: function (interval) {
      interval = interval || 0;
      return new Promise(function (resolve, reject) {
        var pollForAjax;
        pollForAjax = function (interval) {
          if ($.active === 0) {
            resolve('instant');
          } else {
            return setTimeout(function () {
              return pollForAjax(interval);
            }, interval);
          }
        };
        return pollForAjax(interval);
      });
    },

    waitForElementToDisplay: function (selector, time, cb) {
      if (document.querySelector(selector) !== null) {
        cb();
      } else {
        setTimeout(function () {
          fl.util.waitForElementToDisplay(selector, time, cb);
        }, time);
      }
    },

    maxBy: function (arr, fn, init) {
      var best = null;
      var maxVal = init || 0;
      $.map(arr, function (obj){
        var test = fn(obj);
        if(test > maxVal) {
          best = obj;
          maxVal = test;
        }
      });

      return best;
    },
  },

  linkAttrs: function() {
    $('#infoBarQImage209 > img').live('click', fl.cw);
    $('#infoBarQImage210 > img').live('click', fl.cs);
    $('#infoBarQImage211 > img').live('click', fl.cd);
    $('#infoBarQImage212 > img').live('click', fl.cp);
  },

  parseAttribute: function(str) {
    var matches = str.match(/(\S+)\s*([+-])(\d*)/);
    var m = fl.util.iShift(matches);
    if(m[1] == '+')
      return [m[0], parseInt(m[2])];
    else
      return [m[0], 0 - parseInt(m[2])];
  },

  parseAttributes: function (attrString){
    var attrs = {};
    $.map(attrString.split(';'), function(s){
      var parsed = fl.parseAttribute(s);
      attrs[parsed[0]] = parsed[1];
    });

    return attrs;
  },

  equippedValue: function(category, attribute) {
    var item = $('#InvCat-' + category + ' a[onclick^="unadoptThing"]');
    var textEl = $(item).find('span strong')[1];
    var attrs = {};
    if(textEl)
      attrs = fl.parseAttributes(textEl.textContent);
    else
      attrs = {};

    return attrs[attribute] || 0;
  },

  bestOfType: function(category, attribute) {
    var currentVal = fl.equippedValue(category, attribute);
    var selector = '#InvCat-' + category + ' a[onclick^="adoptThing"]';
    var items = $.map($(selector), function (el) {
      var textEl = $(el).find('span strong')[1];
      var attrs;
      if (textEl) {
        attrs = fl.parseAttributes(textEl.textContent);
      } else {
        attrs = {};
      }

      return {el: el,
              attrs: attrs};
    });

    return fl.util.maxBy(items, function(i){
      return i.attrs[attribute];
    }, currentVal);
  },

  chooseBest: function(attribute) {
    var goBackToStory = false;
    if($('#tabnav > li > a.selected').text().trim() != "MYSELF"){
      goBackToStory = true;
      $('#meTab').click();
    }


    this.util.waitForElementToDisplay('#inventory', 500, function(){
      var categories = ['Gloves', 'Hat', 'Clothing', 'Weapon', 'Boots', 'Companion'];
      $.map(categories, function(cat) {
        var best = fl.bestOfType(cat, attribute);
        if(best)
          best.el.click();
        return best;
      });

      if(goBackToStory){
        fl.util.waitForAjax().then(function(){
          console.log('going back');
          $('#storyTab').click();
        });
      }
    });
  },

  cd: function(){
    fl.chooseBest('Dangerous');
  },
  cp: function(){
    fl.chooseBest('Persuasive');
  },
  cs: function(){
    fl.chooseBest('Shadowy');
  },
  cw: function(){
    fl.chooseBest('Watchful');
  },

  tryAgain: function(){
    $('input[value="TRY THIS AGAIN"]').click();
  },
  chooseStorylet: function(name){
    $j('div.storylet:contains("' + name + '")').find('div.go input').click();
  },
  enhancePage: function(){
    fl.linkAttrs();
  },
  chooseAndAgain: function(name) {
    return new Promise(function(resolve, reject) {
      fl.chooseStorylet(name);
      fl.util.waitForAjax().then(function() {
        fl.tryAgain();
        fl.util.waitForAjax().then(resolve);
      });
    });
  },

  doNTimes: function(n, todo) {
    return fl.chooseAndAgain(todo).then(function() {
      if (n > 2) {
        fl.doNTimes(n - 1, todo);
      }
      else if (n == 2) {
        fl.chooseStorylet(todo);
      } else {
        console.log('done');
      }
    });
  },

  autoPickCard: function(){
    var actOnCard = function(eventId){
      return new Promise(function(resolve, reject){
        fl.util.waitForAjax().then(function(){
          eventDb.get(String(eventId)).then(function(dbEvt) {
            if(dbEvt.preferredChoice){
              if(dbEvt.preferredChoice == "discard"){
                discardEl = $j('#cards li').has("input[onclick='beginEvent(" + eventId + ");']").children('input[value="DISCARD"]');
                $(discardEl).click();
                fl.util.waitForAjax().then(function() {
                  console.log("discard", dbEvt);
                  resolve({acted: true, reason: "discarded"});
                });
              }
              else {
                cardEl = $j('#cards li a').has("input[onclick='beginEvent(" + eventId + ");']").children('input');
                $(cardEl).click();
                fl.util.waitForAjax().then(function() {
                  fl.optThenChoose(dbEvt.preferredChoice).then(function(){
                    fl.util.waitForAjax().then(function() {
                      console.log("onwards!");
                      $j('input[value="ONWARDS!"]').click();
                      fl.util.waitForAjax().then(function(){
                        resolve({acted: true, reason: "picked " + dbEvt.preferredChoice + " for " + dbEvt.title + " (" + dbEvt._id + ")"});
                      });
                    });
                  });
                });
              }
            }
            else {
              resolve({acted: false, reason: "no preferred choice for " + dbEvt.title + " (" + dbEvt._id + ")"});
            }
          });
        });
      });
    };

    var actOnAvailableCards = function(){
      return new Promise(function(resolve, reject) {
        fl.util.waitForAjax().then(function(){
          var acted = false;
          var lastReason = "<default>";
          var cards = fl.scraper.visibleCards();
          var nCards = cards.length;
          var maybeActOnN = function(n) {
            if(!acted){
              actOnCard(cards[n]).then(function(result){
                acted = result.acted;
                lastReason = result.reason;

                if(!acted && (nCards > n + 1)){
                  maybeActOnN(n + 1);
                }
                else if (nCards > n + 1) {
                  resolve({acted: acted, reason: "no cards"});
                }
                else {
                  resolve({acted: acted, reason: lastReason});
                }
              });
            }
            else {
              resolve({acted: acted, reason: lastReason});
            }
          };

          maybeActOnN(0);
        });
      });
    };

    if($j('#cards li a').length > 0){
      return actOnAvailableCards();
    }
    else if($j('#cardDeckLink')[0]){
      $j('#cardDeckLink').click();
      return actOnAvailableCards();
    }
    else{
      return new Promise(function(res,rej){ res({acted: false, reason: "no cards"});});
    }
  },

  autoCards: function(){
    fl.autoPickCard().then(function(result){
      if(result.acted){
        fl.util.waitForAjax().then(function(){
          fl.autoCards();
        });
      }
      else {
        fl.util.waitForAjax().then(function(){
          if(fl.scraper.visibleCards().length < 3 && $j('#cardDeckLink')[0]){
            $j('#cardDeckLink').click();
            fl.util.waitForAjax().then(fl.autoCards);
          }
          else{
            console.log("autoCards finished because: " + result.reason);
          }
        });
      }
    });
  }

};

window.fl = fl;

$(fl.enhancePage);
