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
asserts["less work tickets, more focus"] = function(lists, scheduler) {
    return true;
    if (lists["Today"].counts !== undefined && lists["Today"].counts["Work"] === undefined) return true;
    if (lists["Today"].counts["Work"] <= 3) return true;
    globalError = "Today MUST have at most 3 work tickets in progress";
    return false;
}
asserts["Delete Done"] = function(_unused, scheduler) {
    if ((! onceAWeekFlag) || justReset) {
        console.log("skip delete done");
    } else {
        scheduler.deleteAllCardsIn("Done");
    }
    return true;
}

asserts["sort"] = function(lists, scheduler) {
    for (var l in scheduler.requiredLists) {
        var name = scheduler.requiredLists[l];
        var list = lists[name];
        scheduler.sort(list);
    }
    return true;
}
var dada = function(response, lists) {
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
            for (var l in scheduler.requiredLists) {
                if (scheduler.requiredLists[l] === "Inbox") {
                    break;
                }
                card = lists[scheduler.requiredLists[l]].cards[cardID];
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
asserts["remove duplicate events"] = function(lists) {
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
    }).then(function(response){dada(response, lists);});
    return true;
}
asserts["overlap warning"] = function(lists) {
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
asserts["check sane @time"] = function(lists) {

    for (var l in scheduler.requiredLists) {
        var name = scheduler.requiredLists[l];
        var list = lists[name];
        var nextList = lists[list.next];
        graph.mergeList(name, list.next);
    }
    for (var l in scheduler.requiredLists) {
        var name = scheduler.requiredLists[l];
        var res = lists[name].reasign_card_to_proper_list(lists);
        if(!res){
            return res;
        }
    }
    return inbox_schedule(lists);
}

var inbox_schedule = function(lists) {
    var cards = lists["Inbox"].cards;
    for (var c in cards) {
        var card = cards[c];
        var targetList = lists["One Day"];
        var skip = true;
        if(card.date === undefined) {
            continue;
        }
        if(card.date < lists["Today"].start){
            card._network_reschedule();
        }
        if(scheduler.mode == AMBITIOUS){
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
asserts["validate MIT count "] = function(lists) {
    var count = 0;
    for (var n in scheduler.requiredLists) {
        var name = scheduler.requiredLists[n];
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
asserts["scrub"] = function(lists) {
    var cards = lists["Scrub"].cards;
    for (var c in cards) {
        var card = cards[c];
        card._network_scrub();
    }
    return true;
}
