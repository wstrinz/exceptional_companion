// ==UserScript==
// @name         FL Optimize
// @namespace    http://github.com/wstrinz/exceptional_companion
// @version      0.2
// @description  Helps with fl
// @author       Will Strinz
// @match        http://fallenlondon.storynexus.com/Gap/*
// @grant        none
// @require https://github.com/pouchdb/pouchdb/releases/download/4.0.1/pouchdb-4.0.1.min.js
// @require http://coffeescript.org/extras/coffee-script.js
// @require https://raw.githubusercontent.com/lodash/lodash/3.8.0/lodash.js
// @require https://cdn.rawgit.com/jprichardson/string.js/master/lib/string.min.js
// @require https://raw.githubusercontent.com/caldwell/renderjson/master/renderjson.js
// @require http://code.jquery.com/jquery-1.11.3.min.js
// @require https://raw.githubusercontent.com/jackmoore/colorbox/master/jquery.colorbox-min.js
// @require https://raw.githubusercontent.com/wstrinz/exceptional_companion/master/fl_optimize.js
// @require https://raw.githubusercontent.com/wstrinz/exceptional_companion/master/fl_scraper.js
// @require https://raw.githubusercontent.com/wstrinz/exceptional_companion/master/fl_dbops.js

// ==/UserScript==
window.$j = jQuery.noConflict(true);

var link = window.document.createElement('link');
link.rel = 'stylesheet';
link.type = 'text/css';
link.href = 'https://rawgit.com/jackmoore/colorbox/master/example1/colorbox.css';
document.getElementsByTagName("HEAD")[0].appendChild(link);

var remoteDb; //set to address of a couchdb instance for replication
var remoteAddress = localStorage.getItem("remoteDb");
console.log("stored remote address is", remoteAddress);
if(remoteAddress == "local"){
  console.log("using local db");
} else if(remoteAddress != "undefined") {
  console.log("using remote db", remoteAddress);
  remoteDb = remoteAddress;
} else {
  var setAddress = prompt("Address for remote DB to sync with (leave blank use local db)");
  if(setAddress){
    localStorage.setItem("remoteDb", setAddress);
    remoteDb = setAddress;
  }
  else {
    localStorage.setItem("remoteDb", "local");
    remoteDb = "local";
  }
}

branchDb = new PouchDB('branches');
eventDb = new PouchDB('events');
if(remoteDb){
  branchDb.sync(remoteDb + '/fl_branches/', {live: true, retry: true});
  eventDb.sync(remoteDb + '/fl_events/', {live: true, retry: true});
}
qualitiesDb = new PouchDB('qualities');

window.qs = dbQueries;

fl.storyletFor = function(title) { return $j('div.storylet:contains("' + title + '")'); };

fl.challengElForStorylet = function(storylet){ return storylet.find('.challenge.cf'); };

var captureSubmitBranchChoice = function(){
  var oldFun = SubmitBranchChoice;
  SubmitBranchChoice = function(form){
    var branchId = $j(form).find('input[name="branchId"]').val();
    if(branchId){
      title = fl.scraper.branchTitle(branchId);
      var ret = oldFun(form);
      fl.util.waitForAjax().then(function(){
        upsertBranch(title, parseInt(branchId));
      });
      return false;
    }
    else {
      oldFun(form);
      return false;
    }
  };
};

var setEventChoice = function(eventId, choice) {
  eventDb.get(eventId).then(function(evt){
    evt.preferredChoice = choice;

    eventDb.put(evt).then(function(){
      console.log("Event " + evt.title + " (" + evt._id + ") set to '" + evt.preferredChoice + "'");
    });
  });
};

var toggleChoiceForEvent = function(eventId, choice){
  eventDb.get(eventId).then(function(evt){
    if(evt.preferredChoice != choice){
      evt.preferredChoice = choice;
    }
    else{
      evt.preferredChoice = undefined;
    }
    eventDb.put(evt).then(function(){
      console.log("Event " + evt.title + " (" + evt._id + ") toggled to '" + evt.preferredChoice + "'");
    });
  });
};

$(document).keydown(function(e) {
  // Ctrl + g -> grind branch
  // Shift + c -> mark preferred choice
  // Ctrl + Shift + a -> auto pick opportunities
  var hovered, last, storyText;

  if(e.which == 71 && e.ctrlKey) {
    hovered = document.querySelectorAll( ":hover" );
    last = hovered[hovered.length - 1];
    storyText = $(last).text();
    var nTimes = prompt("Grind " + storyText, "2");

    if (nTimes !== null) {
      fl.doNTimes(parseInt(nTimes), storyText);
    }
  }
  else if (e.which == 67 && e.shiftKey) {
    hovered = document.querySelectorAll( ":hover" );
    last = hovered[hovered.length - 1];
    if($j(last).attr('value') == "DISCARD") {
      var container = hovered[hovered.length - 2];
      storyText = $j(container).find('h3').text();
      var eventId = $j(last).attr('onclick').match(/\?eventid=(\d+)/)[1];

      var doChoice = confirm("Toggle discard for '" + storyText + "' (" + eventId + ")?");
      if(doChoice){
        toggleChoiceForEvent(eventId, "discard");
      }
    }
  }
  else if (e.which == 65 && e.shiftKey && e.ctrlKey) {
    fl.autoCards();
  }
});

var findQuality = function(branch_name) {
};

$(document).keydown(function(e) {
    if(e.which == 79 && e.ctrlKey) {
      console.log("pick optimal items then choose this");
    }
});

/* jshint ignore:start */
function evalCS(source) {
  var coffeescript = CoffeeScript.compile(source.toString()).split("\n");

  eval(coffeescript.join("\n"));
}



var inline_src = (<><![CDATA[
window.storyDB =
    events: {}
    branches: {}

window.upsertEvent = (id) ->
  eventDb.get(String(id)).then (evt) ->
    plans = $j('.storylet').has('a.bookmark-plan.active')
    if(!evt.preferredChoice && plans.length > 0)
      evt.preferredChoice = $j(plans[0]).find('h5').text()
      eventDb.put(evt).then (resp) ->
        console.log('updated event preference', evt)
      .catch (err) ->
        console.log('updating event preference failed!', err)
    else
      console.log('already have ' + id, evt)
  .catch (err) ->
    newEvt = fl.scraper.scrapeEvent()
    newEvt._id = String(id)
    eventDb.put(newEvt).then (resp) ->
      console.log('saved new event', resp)
    .catch (err) ->
      console.log('saving new event failed!', err)

window.upsertBranch = (title, id) ->
  scraped = fl.scraper.scrapeBranch()
  scraped.title = title
  scraped._id = String(id)
  branchDb.get(String(id)).then (dbBranch) ->
    dbOperations.updateOrIgnoreBranch(dbBranch, scraped);
  , (err) ->
    console.log('missing branch ' + id, err)
    branchDb.put(scraped).then (resp) ->
      console.log('saved new branch', resp, 'with result', scraped.results[0])
    , (err) ->
      console.log('saving new branch failed!', err)

capturePlanMarkers = (eventId) ->
  storyletEls = $j('.storylet').has('a.bookmark-plan')
  $j.each storyletEls, (indx, el) ->
    planEl = $j(el).find('.bookmark-plan')
    $j(planEl).click ->
      fl.util.waitForAjax().then ->
        if planEl.hasClass("active")
          setEventChoice(String(eventId), $j(el).find('h5').text())
        else
          setEventChoice(String(eventId), undefined)

captureBeginEvent = ->
    oldFn = window.beginEvent
    window.beginEvent = (id) ->
      oldFn(id)
      fl.util.waitForAjax().then ->
          console.log("beginning #{id}")
          upsertEvent(parseInt(id))
          fl.annotator.annotateBranches()
          capturePlanMarkers(id)


captureLoadMainContent = ->
  oldFn = window.loadMainContent
  window.loadMainContent = ->
    contentAddr = arguments[0]
    if contentAddr.match(/Begin\\?eventid=(\\d+)$/)
      eventId = contentAddr.match(/Begin\\?eventid=(\\d+)$/)[1]
      oldFn.apply(window, arguments)
      fl.util.waitForAjax().then ->
        console.log("trying #{eventId} again")
        upsertEvent(parseInt(eventId))
        fl.annotator.annotateBranches()
        fl.annotator.annotateEvents()
        fl.annotator.annotateCards()
    else
      oldFn.apply(window, arguments)
      fl.util.waitForAjax().then ->
        fl.annotator.annotateBranches()
        fl.annotator.annotateEvents()
        fl.annotator.annotateCards()

captureLoadContent = ->
    oldFn = window.loadMainContentWithParams
    window.loadMainContentWithParams = ->
      params = arguments[1]
      if params['branchid']
        id = params['branchid']
        title = fl.scraper.branchTitle(id)
        oldFn.apply(window, arguments)
        fl.util.waitForAjax().then ->
          upsertBranch(title, parseInt(id))
      else
        oldFn.apply(window, arguments)

captureDrawCards = ->
  $j(document).on 'click', '#card_deck', () ->
    fl.util.waitForAjax().then () ->
      fl.annotator.annotateCards()

fl.annotator =
  getShortDescription: (dbEvt) ->
    collapsedDesc = (shortDs) ->
      if _.all(shortDs, (sd) -> sd == "Explored" || sd == "Inevitable")
        "Explored"
      else if _.any(shortDs, (sd) -> sd != "Unknown")
        "Partial"
      else
        "Unknown"

    resultSummary = (branch) ->
      itemDesc = (item) -> "#{item.count[0]} to #{item.count[1]} #{item.name}"
      descs = _.map ['success', 'fail'], (outcome) ->
        _.map(_.flatten(_.pluck(_.filter(branch.results, type: outcome), 'items')), itemDesc).join(', ')
      "<strong>#{branch.title}:</strong><br>On success, you could receive #{descs[0] || 'nothing nice'}.<br>On failure, #{descs[1] || 'nothing nice'}"

    new Promise (resolve, reject) ->
      if dbEvt.isTerminal
        resolve "Inevitable"
      else if dbEvt.branches.length == 0
        resolve "Inconsistent!"
      else
        branchPromises = _.map dbEvt.branches, (br) ->
          new Promise (resi, reji) ->
            branchDb.get(br).then (dbBranch) ->
              branchDesc = fl.annotator.branchAttrs.shortDesc dbBranch
              resi {completion: branchDesc, resultsDesc: resultSummary(dbBranch)}
            , (err) ->
              resi {completion: "Unknown", resultsDesc: "Unknown"}

        Promise.all(branchPromises).then (res) ->
          resolve {completion: collapsedDesc(_.pluck(res, 'completion')), resultDesc: _.pluck(res, 'resultsDesc').join("<br>\n")}
        , () ->
          console.log 'i guess rejected?', arguments
          resolve {completion: "Error", resultsDesc: "Error"}

  branchAttrs:
    shortDesc: (dbBranch) ->
      switch dbBranch.results.length
        when 0
          if dbBranch.isSocial
            "Social"
          else
            "Unknown"
        when 1
          if dbBranch.results[0].type == 'inevitable'
            'Inevitable'
          else
            'Partial'
        when 2
          "Explored"
        else
          "wtf is going on here?"

    completenessDesc: (dbBranch) ->
      switch dbBranch.results.length
        when 0
          "Branch unexplored"
        when 1
          dbBranch.results[0].type + ' result known'
        when 2
          "both #{dbBranch.results[0].type} and #{dbBranch.results[1].type} known"
        else
          "we have #{dbBranch.results.length} results for this branch. what is going on?"

    colorForBranch: (dbBranch) ->
      cs = fl.annotator.branchColors
      switch dbBranch.results.length
        when 0
          if dbBranch.isSocial
            cs.social
          else
            cs.unexplored
        when 1
          if dbBranch.results[0].type == 'inevitable'
            cs.full
          else
            cs.partial
        when 2
          cs.full
        else
          cs.unknown

  branchColors:
      unexplored: 'rgba(255, 138, 47, 0.45)'
      partial: 'rgba(175, 190, 255, 0.42)'
      full: 'rgba(8, 214, 76, 0.16)'
      unknown: 'rgba(228, 0, 25, 0.20)'
      social: 'rgba(8, 214, 76, 0.16)'

  annotateEvent: (eventId) ->
    eventEl = $j('.storylet').has("input[onclick='beginEvent(#{eventId});']")

    cs = fl.annotator.branchColors
    eventColors =
      Explored: cs.full
      Partial: cs.partial
      Unexplored: cs.unexplored
      Unknown: cs.unknown

    applyAnnotation = (annotationBody, shortD) ->
      button = '<br><input type="button" class="standard_btn">'
      annotationId = "#eventAnnotation#{eventId}"
      eventAnnotation = "<br><div id='eventAnnotation#{eventId}'><div class='toggle'></div><div class='annotation'></div></div>"
      $(eventEl).append(eventAnnotation)
      $j(annotationId).find('.toggle').append(button).find('input').attr('style', "width: 95px !important; background-color: #{eventColors[shortD.completion]};").val(shortD.completion).click (e) ->
        $j(annotationId).find('.annotation').toggle()

      $j(annotationId).find('.annotation').append("<div style='font-size: 0.8em; width: 400px;'>#{shortD.resultDesc}</div>").append(annotationBody).hide()
      $j(annotationId).css('position', 'relative')
                .css('left', '83px')
                .css('bottom', '26px')
                .css('margin-bottom', '-26px')
                .css('width', '250px')


    if eventEl
      eventDb.get(String(eventId)).then (dbEvt) ->
        fl.annotator.getShortDescription(dbEvt).then (shortD) ->
          applyAnnotation renderjson(dbEvt), shortD
        , (err) ->
          console.log('shortD err', err)
          applyAnnotation renderjson(dbEvt), "Err"
      , (err) ->
          applyAnnotation "<p>Never Visited</p>", {completion: "Unexplored", resultDesc: "Unexplored"}


  annotateBranch: (branchId) ->
    applyAnnotations = (shortD, fullD, bgColor) ->
      annotation = '<br><input type="button" class="standard_btn">'
      branchEl = $("#branch#{branchId}")
      storylet_lhs = $("#branch#{branchId} .storylet_lhs")
      storylet_lhs.append(annotation)

      infoButton = $("#branch#{branchId} .storylet_lhs input")

      branchEl.append("<div id=branchAnnotation#{branchId}>#{fullD}</div>")
      $("#branchAnnotation#{branchId}").hide()
      infoButton.css('background-color', bgColor).css('max-width', '80px').attr('value',shortD)
      infoButton.click (evt) ->
          $("#branchAnnotation#{branchId}").toggle()

    appendFullInfo = (parentEl, dbBranch) ->
      #displayJson = (branch) ->
      $(parentEl).append renderjson(dbBranch)

    branchDb.get(branchId).then (dbBranch) ->
      applyAnnotations(fl.annotator.branchAttrs.shortDesc(dbBranch), fl.annotator.branchAttrs.completenessDesc(dbBranch), fl.annotator.branchAttrs.colorForBranch(dbBranch))
      appendFullInfo($("#branchAnnotation#{branchId}"), dbBranch)
    , (err) ->
      applyAnnotations("Unknown", "Never Explored", fl.annotator.branchColors.unexplored)


  annotateCard: (eventId) ->
    cardEl = $j('#cards li').has("input[onclick='beginEvent(#{eventId});']")
    if cardEl
      eventDb.get(String(eventId)).then (dbEvt) ->
        fl.annotator.getShortDescription(dbEvt).then (shortD) ->
          dbQueries.resultsForEvent(eventId).then (itemsDesc) ->
            $(cardEl).find('span.tt').append("<p><strong>#{shortD.completion}</strong></p>")
            $(cardEl).find('span.tt').append("<p>#{itemsDesc}</p>")
        , () ->
          $(cardEl).find('span.tt').append("<p>Err</p>")
      , () ->
        $(cardEl).find('span.tt').append("<p>Never Visited</p>")

  annotateBranches: () ->
    _.each fl.scraper.branchesForEvent(), fl.annotator.annotateBranch

  annotateEvents: () ->
    _.each fl.scraper.eventsOnPage(), fl.annotator.annotateEvent

  annotateCards: () ->
    fl.util.waitForAjax().then () ->
      _.each fl.scraper.visibleCards(), fl.annotator.annotateCard

wrapEvents = ->
    captureBeginEvent()
    captureLoadContent()
    captureLoadMainContent()
    captureSubmitBranchChoice()
    captureDrawCards()

fl.scraper.eventsOnPage = () ->
  evtEls = $j('.storylet').has('input[onclick^="beginEvent"]')
  _.map evtEls, (el) ->
    $j(el).find('input[onclick^="beginEvent"]').attr('onclick').match(/beginEvent\((\d+)\)/)[1]

fl.scraper.visibleCards = () ->
  cardEls = $j('#cards li').has('input[onclick^="beginEvent"]')
  _.map cardEls, (el) ->
    $j(el).find('input[onclick^="beginEvent"]').attr('onclick').match(/beginEvent\((\d+)\)/)[1]

fl.scraper.updatedQualities =  () ->
    extractQuality = (e) ->
      regexes =
        lostGained:
          regex: /You've (lost|gained) a (new)? quality: (\w+)/
          qualityN: 3
          directionN: 1
        incDec:
          regex: /(.+) is (increasing|dropping)\.\.\./
          qualityN: 1
          directionN: 2
        changedLevel:
          regex: /(.+) has (increased|dropped) to (\d+)/
          qualityN: 1
          directionN: 2
        occurrence:
          regex: /An occurrence! Your '(.+)' Quality is now (\d+)/
          qualityN: 1
          directionN: 2
        hasFone:
          regex: /Your '(.+)' Quality has (gone)/
          qualityN: 1
          directionN: 2

      eText = $(e).text()
      theRegex = _.find regexes, (r) -> eText.match(r.regex)

      if theRegex
        matches = eText.match(theRegex.regex)

        quality: matches[theRegex.qualityN]
        direction: matches[theRegex.directionN]
      else
        null

    qualityEls = $('div.quality_update_box p')
    qmap = _.map(qualityEls, extractQuality)
    _.compact(qmap)


fl.scraper.qualities =
  getLhsQualities: () ->
    parseQuality = (el) ->
      extractionRegex = /([\w\s]+) (\d+)\s+([+-]\d+)?/
      parts = $j(el).text().match(extractionRegex)

      _id: parts[1]
      natural: parts[2]
      bonus: parts[3] || 0

    actionsObj =
      id: 'ACTIONS',
      natural: $j('#infoBarCurrentActions').text()
      bonus: 0

    ret = _.map $j('span[id ^= "infoBarQLevel"].red').parent(), parseQuality

    ret = ret.concat actionsObj


fl.updateQualities = () ->
  qualitiesDb.bulkDocs(fl.scraper.qualities.getLhsQualities()).then () ->
    console.log('qual update')
  , () ->
    console.log 'failed qual update'

currentTab = ->
  $('#tabnav > li > a.selected').text().trim()

$ () ->
  wrapEvents()
  fl.util.waitForAjax().then ->
    fl.annotator.annotateBranches()
    fl.annotator.annotateEvents()
    fl.annotator.annotateCards()


]]></>).toString();
var compiled = this.CoffeeScript.compile(inline_src);
eval(compiled);
/* jshint ignore:end */
