"use strict";
var asserts = {};

asserts["Check lists with no time req"] = function(lists) {
    var requiredLists = ["Done", "Inbox"]
    for (var r in requiredLists) {
        var rl = requiredLists[r];
        var found = false;
        for (var l in lists) {
            var lt = lists[l];
            if (lt.name == rl) {
                found = true;
                break;
            }
        }
        if (!found) {
            globalError = "List \"" + rl + "\" must exist! I'm not smart enough to create that for you yet :(<br/>"
            return false;
        }
    }
    return true;
}
asserts["less work tickets, more focus"] = function() {
    return true;
    if (lists["Today"].counts !== undefined && lists["Today"].counts["Work"] === undefined) return true;
    if (lists["Today"].counts["Work"] <= 3) return true;
    globalError = "Today MUST have at most 3 work tickets in progress";
    return false;
}
asserts["Delete Done"] = function(lists) {
    if ((! onceAWeekFlag) || justReset) {
        console.log("skip delete done");
        return true;
    }
    console.log(lists["Done"]);
    var cards = lists["Done"].cards;
    console.log(cards);
    for (var c in cards) {
        var card = cards[c];
        console.log(card.name);
        card.delete();
    }
    return true;
}

asserts["overdue stuff"] = function(lists) {
    var cards = {};
    Object.assign(cards, lists["Today"].cards);
    Object.assign(cards, lists["Inbox"].cards);
    for(var c in cards){
        var card = cards[c];
        if( card.date < lists["Today"].start){
           reallyOverdue.push(card);
        }
    }
    return true;
}
var arraySortedByPos;
var arraySortedBySize;
asserts["sort"] = function() {
    for (var l in requiredLists) {
        var name = requiredLists[l];
        var list = lists[name];
        var cards = list.cards;
        var arrayCards = Object.keys(cards).map(function(key) {
            return cards[key];
        });
        arraySortedByPos = arrayCards.slice(0);
        arraySortedByPos.sort(sortPos);
        arraySortedBySize = arrayCards.slice(0);
        var sortFunc = list.sortFunction;
        arraySortedBySize.sort(sortFunc);
        var s1 = arraySortedByPos.map(function(el) {
            return el.size;
        }).toString();
        var s2 = arraySortedBySize.map(function(el) {
            return el.size;
        }).toString();
        if (s1 != s2) {
            console.log(name + " is not sorted!");
            incrementator = 0;
            doOver();
            return true;
        }
    }
    return true;
}
var dada = function(response) {
    var events = response.result.items;
    if (events.length > 0) {
        for (var i = 0; i < events.length; i++) {
            var event = events[i];
            var cardID = event.description;
            if (cardID == "" || cardID === undefined) {
                _deleteGoogleEvent(event.id);
                continue;
            }
            var card;
            for (var l in requiredLists) {
                if (requiredLists[l] === "Inbox") {
                    break;
                }
                card = lists[requiredLists[l]].cards[cardID];
                if (card !== undefined) {
                    break;
                }
            }
            if (card === undefined || card.due === undefined || card.due === null || card.eventId != event.id) {
                _deleteGoogleEvent(event.id);
            } else {
                var lc = lists[card.listname];
                var bul = new Date((card.due)).getTime();
                if (bul < lc.start) {
                    _deleteGoogleEvent(event.id);
                    continue;
                } else if (new Date(event.start.dateTime).getTime() != new Date(card.due).getTime()) {
                    addToGcal(card);
                }
            }
        }
    }
}
asserts["remove duplicate events"] = function() {
    var maxResults = 25;
    if(Math.random() < 0.25){
        maxResults = 125;
    }

    gapi.client.calendar.events.list({
        'calendarId': 'qmo9nhu10p91olod32spqmjts8@group.calendar.google.com',
        'timeMin': (new Date(0)).toISOString(),
        'showDeleted': false,
        'singleEvents': true,
        'maxResults': maxResults,
        'orderBy': 'startTime'
    }).then(dada);
    return true;
}
asserts["overlap warning"] = function() {
    var cur = ["Today", "Tomorrow", "Week"];
    var now = new Date().getTime();
    var count = 0;
    for (var l in cur) {
        var list = lists[cur[l]];
        var cards = list.cards;
        var dada = Object.keys(cards).map(function(key) {
            return cards[key];
        });
        var baba = dada.slice(0);
        baba.sort(sortTime);
        for (var c = 0; c < baba.length - 1; c++) {
            var card = baba[c];
            if (card.pass !== true) {
                if (card.due) {
                    var _1 = new Date(card.due).getTime();
                    var nextCard = baba[c + 1];
                    if (nextCard.pass) {
                        continue;
                    }
                    if (card.mit ^ nextCard.mit) {
                        continue;
                    }
                    if (nextCard.due) {
                        var _2 = new Date(nextCard.due).getTime();
                        if (card.tick * 1000 * 60 * 60 + _1 > _2) {
                            count = count + 1;
                            addWarning("");
                        }
                    }
                }
            }
        }
    }
    addWarning("Overlap warning for <b>" + count + "</b> cards.<br/>");

    return true;
}
asserts["check sane @time"] = function() {

    for (var l in requiredLists) {
        var name = requiredLists[l];
        var list = lists[name];
        var nextList = lists[list.next];
        graph.mergeList(name, list.next);
    }
    for (var l in requiredLists) {
        var name = requiredLists[l];
        var res = lists[name].reasign_card_to_proper_list();
        if(!res){
            return res;
        }
    }
    return inbox_schedule();
}

var inbox_schedule = function() {
    var cards = lists["Inbox"].cards;
    if(mode == CORE){
        return;
    }
    for (var c in cards) {
        var card = cards[c];
        var targetList = lists["One Day"];
        var skip = true;
        if(card.date === undefined) {
            continue;
        }
        if(card.date < lists["Today"].start){
            card.reschedule();
        }
        for(var l in lists){
            if(l === "Inbox" || l === "One Day" || l === "Done"){
                continue;
            }
            var list = lists[l];
            if(card.date >= list.start && card.date <= list.end){
                if(list.canTakeCard(card)){
                    targetList = list;
                    skip = false;
                }
                else {
                    card.deleteGoogleEvent();
                }
            }
        }
        if(skip){
            continue;
        }
        targetList.takeCardFrom(card, lists["Inbox"]);
        addToGcal(card);
        console.log(card.name + " moved to " + targetList.name );
    }
    return true;
}
asserts["validate MIT count "] = function() {
    var count = 0;
    for (var n in requiredLists) {
        var name = requiredLists[n];
        var list = lists[name];
        if(list.maxMitCount === undefined){
            continue;
        }
        if(list.mitCount > 0){
            addMessage("For <b>" + list.name + "</b> try to focus on:<br/>");
            var cards = list.cards;
            for (var c in cards) {
                var card = cards[c];
                if(card.mit && card.due === null){
                    addError(card.name + " has no due date<br/>");
                    return false;
                }
                if(card.mit && ! card.dueComplete){
                    addMessage(card.name + "<br/>");
                    mitMe(card.name);
                }
            }
        }
        if (list.mitCount > list.maxMitCount) {
            addError("Too many MITs for " + name + "!<br/>");
        }
        if (list.mitCount != list.maxMitCount) {
            if(count < 1) {
                addWarning("Consider adding " + (list.maxMitCount - list.mitCount) + " MITs to " + name + "<br/>");
                count = count + 1;
            } else {
                addWarning("");
            }
        }
    }
    return true;
}
asserts["scrub"] = function() {
    var cards = lists["Scrub"].cards;
    for (var c in cards) {
        var card = cards[c];
        card.scrub();
    }
    return true;
}
