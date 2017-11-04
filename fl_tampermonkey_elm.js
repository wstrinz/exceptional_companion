// updated 6/16/2017
// ==UserScript==
// @name         Exceptional Companion 2
// @namespace    http://github.com/wstrinz/exceptional_companion
// @version      2.0.2
// @description  Helps with fl
// @author       Will Strinz
// @match        http://fallenlondon.storynexus.com/Gap/*
// @grant        none
// @require https://github.com/pouchdb/pouchdb/releases/download/4.0.1/pouchdb-4.0.1.min.js
// @require http://coffeescript.org/extras/coffee-script.js
// @require https://raw.githubusercontent.com/lodash/lodash/3.8.0/lodash.js
// @require https://cdn.rawgit.com/jprichardson/string.js/master/lib/string.min.js
// @require http://code.jquery.com/jquery-1.11.3.min.js
// @require https://raw.githubusercontent.com/wstrinz/exceptional_companion/elm/elm/elm_interface.js?v=0.6
// @require https://raw.githubusercontent.com/wstrinz/exceptional_companion/master/fl_optimize.js?v=3.2
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/6.18.2/babel.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/6.16.0/polyfill.js
// ==/UserScript==


// require https://raw.githubusercontent.com/jackmoore/colorbox/master/jquery.colorbox-min.js
// require https://raw.githubusercontent.com/wstrinz/exceptional_companion/master/fl_optimize.js?v=3.2
// require https://raw.githubusercontent.com/wstrinz/exceptional_companion/master/fl_scraper.js?v=3.1
// require https://raw.githubusercontent.com/wstrinz/exceptional_companion/master/fl_dbops.js?v=3

window.$j = jQuery.noConflict();

/* jshint ignore:start */
var inline_src = (<><![CDATA[
    /* jshint ignore:end */
    /* jshint esnext: false */
    /* jshint esversion: 6 */

    //console.log("foop");
    let waitForAjax = () => {
      return new Promise((accept, reject) => {
        let check = () => {
          if ($.active === 0) {
            accept();
            return true;
          } else {
            return false;
          }
        };

        function watch() {
          if(check()){
            return true;
          } else {
            setTimeout(() => { watch(); }, 250);
          }
        }

        watch();
      });
    };

    console.log($j);
    let choosePlan = () => $($('.bookmark-plan.complete').parent()).find('.go input')[0].click();
    let tryAgain = () => {
        let trybutton = $('input[value="TRY THIS AGAIN"]');
        if (trybutton[0]) {
            trybutton.click();
        } else {
            $('input[value="ONWARDS!"').click();
        }
    };
    $j(document).ready(() => {
        console.log('hello');
        console.log(window.fl);
        jQuery('.content').prepend('<div id="exceptionalDiv">hi</div>');
        var node = document.getElementById('exceptionalDiv');
        var app = Elm.Hello.embed(node);

        app.ports.choosePlan.subscribe(function(word) {
            console.log("chooseplan");
            choosePlan();

            waitForAjax().then(() => app.ports.nextAction.send("blank"));
        });
        app.ports.tryAgain.subscribe(function(word) {
            console.log("again");
            tryAgain();
            waitForAjax().then(() => app.ports.nextAction.send("blank"));
        });
    });
/* jshint ignore:start */
]]></>).toString();
var c = Babel.transform(inline_src, { presets: [ "es2015", "es2016" ] });
eval(c.code);

console.log(window.fl);

grind = (branch, evt) => {
   $(`#branch${branch} > form > div.qreqs-and-go > div > input`).click();
   waitForAjax().then(() => {
     loadMainContent(`/Storylet/Begin?eventid=${evt}`);
   })
}

a = () => document.querySelector('#branch4594 .go input').click()
b = () => document.querySelector('#ChooseActButton').click()
c = () => loadMainContent('/Storylet/Begin?eventid=10811')

//pray = () => $('#branch5119 > form > div.qreqs-and-go > div > input').click();
//tryPrayAgain = () => loadMainContent('/Storylet/Begin?eventid=12236');

//choosePlan = () => $($('.bookmark-plan.complete').parent()).find('.go input').click();



onwards = () => $('input[value="ONWARDS!"').click()
drawCards = () => $('#cardDeckLink').click()
clickFirstCard = () => $('#cards > li > a > input')[0].click()
drawOrCard = () => {
  let firstCard = $('#cards > li > a > input')[0];
  if(firstCard){
    clickFirstCard();
  } else {
    drawCards();
  }
}

doLoop = () => { a(); f.waitForAjax().then(() => {b(); waitForAjax().then(c)})}
prayLoop = () => { a(); f.waitForAjax().then(() => {b(); waitForAjax().then(c)})}
