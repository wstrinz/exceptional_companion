/* global fl, $, _ */
fl.scraper = {
  eventTitle: function () {
    return $('div.storylet_flavour_text h3').text().trim();
  },
  isResult: function () {
    return !($('.quality_update_box').length === 0);
  },
  isInvitation: function () {
    return !!$('.externalInviteButton')[0];
  },
  isSocial: function () {
    return !!$('select#targetCharacterId')[0] || fl.scraper.isInvitation();
  },
  isTerminal: function () {
    return (fl.scraper.isResult() || fl.scraper.isSocial());
  },
  isSuccess: function () {
    return !!$('div.quality_update_box:contains("succeeded")')[0];
  },
  isFail: function () {
    return !!$('div.quality_update_box:contains("failed")')[0];
  },
  isInevitable: function () {
    return this.isResult() && !(this.isSuccess() || this.isFail());
  },
  isLuck: function() {
    return $('#quality_update:contains("Luck")').length > 0;
  },
  isFortunate: function() {
    return this.isLuck() && $('#quality_update:contains("Luck")').siblings('p:contains("fortunate")').length > 0;
  },
  isUnlucky: function() {
    return this.isLuck() && $('#quality_update:contains("Luck")').siblings('p:contains("unlucky")').length > 0;
  },
  resultType: function() {
    if (!this.isResult()) {
      return 'subBranch';
    } else if (this.isFortunate()) {
      return 'fortunate';
    } else if (this.isUnlucky()) {
      return 'unlucky';
    } else if (this.isSuccess()) {
      return 'success';
    } else if (this.isFail()) {
      return 'fail';
    } else if (this.isInevitable()) {
      return 'inevitable';
    } else {
      console.log('unknown result type');
      return 'unknown';
    }
  },
  branchesForEvent: function() {
    var branchEls, getIds;
    getIds = function (els) {
      return _.map(els, function (el) {
        return el.id.match(/branch(\d+)/)[1];
      });
    };
    branchEls = $('div.storylet[id^="branch"]');
    if (branchEls.length > 0) {
      return getIds(branchEls);
    } else {
      return [];
    }
  },
  branchTitle: function(id) {
    return $('#branch' + id + ' h5').text().trim();
  },
  updatedQualities: function () {
    var extractQuality, qualityEls;
    extractQuality = function (e) {
      var eText, matches, regexes, theRegex;
      regexes = {
        lostGained: {
          regex: /You've (lost|gained) a (new)? quality: (\w+)/,
          qualityN: 3,
          directionN: 1
        },
        incDec: {
          regex: /(.+) is (increasing|dropping)\.\.\./,
          qualityN: 1,
          directionN: 2
        },
        changedLevel: {
          regex: /(.+) has (increased|dropped) to (\d+)/,
          qualityN: 1,
          directionN: 2
        }
      };
      eText = $(e).text();
      theRegex = _.find(regexes, function (r) {
        return eText.match(r.regex);
      });
      if (theRegex) {
        matches = eText.match(theRegex.regex);
        return {
          quality: matches[theRegex.qualityN],
          direction: matches[theRegex.directionN]
        };
      } else {
        return null;
      }
    };
    qualityEls = $('div.quality_update_box p');
    return _.compact(_.map(qualityEls, extractQuality));
  },
  updatedItems: function () {
    var extractionRegex, updateEls;
    extractionRegex = /You\'ve (lost|gained) (\d+) x ([^(]+)/;
    updateEls = $('div.quality_update_box p');
    updateEls = _.filter(updateEls, function (el) {
      return $(el).text().match(extractionRegex);
    });
    return _.map(updateEls, function (i) {
      var matched = $(i).text().match(extractionRegex);
      return {
        name: matched[3].trim(),
        count: [parseInt(matched[2], 10), parseInt(matched[2], 10)],
        direction: matched[1]
      };
    });
  },
  getResult: function () {
    if (!fl.scraper.isResult()) {
      return [];
    } else {
      return [
        {
          title: fl.scraper.eventTitle(),
          type: fl.scraper.resultType(),
          qualities: fl.scraper.updatedQualities(),
          items: fl.scraper.updatedItems()
        }
      ];
    }
  },
  scrapeEvent: function() {
    return {
      title: fl.scraper.eventTitle(),
      isTerminal: fl.scraper.isTerminal(),
      isSocial: fl.scraper.isSocial(),
      results: fl.scraper.getResult(),
      branches: fl.scraper.branchesForEvent()
    };
  },
  scrapeBranch: function() {
    return {
      isTerminal: fl.scraper.isTerminal(),
      isSocial: fl.scraper.isSocial(),
      subBranches: fl.scraper.branchesForEvent(),
      results: fl.scraper.getResult()
    };
  },
  currentLocation: function() {
    return $('#topMap img:not([class])').attr('alt');
  }
};
