/*global encodeURIComponent document setInterval clearInterval $ */
var console;
if (typeof console === "undefined") {
    console = { 
        log: function () {}, 
        dir: function () {}
    };  
}

var TRIXX = {};
TRIXX.Data = {};
TRIXX.Utils = {};
TRIXX.Views = {};
TRIXX.Views.Status = {};
TRIXX.Views.Vhost = {};
TRIXX.Views.Queue = {};
TRIXX.Views.Exchange = {};

TRIXX.Utils.removeSpaces = function (str) {
    return str.split(' ').join("");
};

//TODO: consider returning JSON in a JSON format, ie runningApplication not running-application
TRIXX.Utils.formatQueueId = function (queue, postfix)  {
    // this needs to handle other chars other than dot
    return queue.name.replace(/[.]/g, "-") + "-" + postfix;
};

TRIXX.Utils.encode = function (str) {
    if (str === null || str === "") {
        return "";
    }
    return encodeURIComponent(str);
};

TRIXX.Utils.removeTrailingSlash = function (str) {
    if (str && str[str.length - 1] === "/") {
        return TRIXX.Utils.removeTrailingSlash(str.slice(0, str.length - 1));
    }
    return str;
};

TRIXX.Utils.constructGetUrl = function (resource, action, vhost) {
    var encodedResource, encodedAction, encodedVhost;
    encodedResource = TRIXX.Utils.encode(resource);
    encodedAction   = TRIXX.Utils.encode(action);
    encodedVhost    = TRIXX.Utils.encode(vhost);

    if (encodedAction === "") {
        return TRIXX.Utils.removeTrailingSlash("/" + encodedResource + "/" + encodedVhost);
    }

    return TRIXX.Utils.removeTrailingSlash("/" + encodedResource + "/" + encodedAction + "/" + encodedVhost);
};

TRIXX.Data.find = function (resource, action, findVhostFn, successFn, errorFn) {
    var url = TRIXX.Utils.constructGetUrl(resource, action, findVhostFn === null ? null : findVhostFn());
    console.log('[TRIXX.Data.find] url="' + url + '"');

    $.ajax({
        url: url,
        type: "GET",
        success: 
        function (data) { 
            successFn(JSON.parse(data)); 
        }, 
        error: 
            errorFn || function () { 
                console.log('[TRIXX.Data.find] ooops, failed to retrieve="' + resource + '"'); 
            }
        });
};

TRIXX.Views.Queue.render = function (queues) {
    var fourColumnTemplate, columnTemplate, columnLastTemplate, durableHtml, autoDeleteHtml, html = "";

    queues.sort(function (a, b) {
        var q1 = a.name, q2 = b.name;

        if (q1 == q2) {
          return 0;
        } 
        return q1 < q2 ? -1 : 1;
    });

    $(".queue").remove();

    durableHtml = function (queue) {
        return queue.durable === "true" ? '<div class="queue-status">durable</div>' : "";
    };

    autoDeleteHtml = function (queue) {
        return queue.autoDelete === "true" ? '<div class="queue-status">auto delete</div>' : "";
    };

    fourColumnTemplate = function (title, columns) {
        return title + '<div class="columns four-columns">' + columns + '</div>';
    };

    columnLastTemplate = function (queue, label, value) {
        var html = '<div class="column lastcolumn">';  

        if (label !== "" || value !== "") {
            html += [
                '<div class="verticalcenter">',
                '  <strong id="' + TRIXX.Utils.formatQueueId(queue, label)  + '" class="med">',
                value,
                '  </strong>',
                label,
                '</div>'
            ].join('');   
        }
        html += '</div><br clear="all"/>';
        return html;
    };

    columnTemplate = function (queue, label, value) {
        return [
            '<div class="column">',
            '  <div class="verticalcenter">',
            '    <strong id="' + TRIXX.Utils.formatQueueId(queue, label) + '" class="med">',
            value,
            '    </strong>',
            label,
            '  </div>',
            '</div>'
        ].join('');
    };

    $.each(queues, function () {
        html += [
                '<div class="queue">',
                '<h2>' + this.name + '</h2>',
                durableHtml(this),
                autoDeleteHtml(this),
                fourColumnTemplate("<h3>Status</h3>",
                    columnTemplate(this, "consumers", this.consumers) +
                    columnTemplate(this, "transactions", this.transactions) +
                    // convert memory to human size
                    columnTemplate(this, "memory", this.memory) +
                    columnLastTemplate(this, "acks-uncommitted", this["acks-uncommitted"])) +
                fourColumnTemplate("<h3>Messages</h3>",
                    // show numbers with delimiter
                    columnTemplate(this, "total", this.messages) + 
                    columnTemplate(this, "ready", this["messages-ready"]) +
                    columnTemplate(this, "unacknowledged", this["messages-unacknowledged"]) +
                    columnLastTemplate(this, "uncommitted", this["messages-uncommitted"])),
                '</div>'
            ].join('');
    });

    $('#vhost').append(html);

};

TRIXX.Views.Vhost.render = function (vhosts) {
    var vhostDropdown, onVhostSelect, firstVhost;

    onVhostSelect = function (vhost) {
        $("#queue").remove();
        console.log(vhost + " is selected");
        TRIXX.Data.find("queues", null, 
            function () { 
                return vhost; 
            }, 
        TRIXX.Views.Queue.render);
    };

    vhostDropdown = (function () {
        var vhostEl, vhostSorter, selectEl;
        vhostEl = $('#vhost');
        vhostEl.append("<h3>Virtual Hosts<h3>");
        selectEl = $('<select id="vhosts">');

        vhostEl.append(selectEl);

        selectEl.change(function () { 
            onVhostSelect($(this).val()); 
        });

        vhostSorter = function (a, b) { 
            return a.name < b.name ? -1 : 1; 
        };

        $.each(vhosts.sort(vhostSorter), function () {
            var vhost = this.name;
            selectEl.append('<option value="' + vhost + '">' + vhost + '</option>');
        });

        selectEl.wrap('<div id="host-status">');
        selectEl.after('<h3>Queues</h3>');
    }());
    
    firstVhost = (vhosts && vhosts.length > 0) ? vhosts[0].name : null; 
    onVhostSelect(firstVhost);
};

TRIXX.Views.Exchange.render = function (exchanges) {

};

TRIXX.Views.Status.render = function (status) {
    var runningApplications, runningNodes, formatRunningNodes;

    runningApplications = function () {
        var services = []; 
        $.each(status["running-applications"], function () {
            services.push(this.service);    
        });

        return services.join(", ");
    };

    formatRunningNodes = function (node, runningOrStopped) {
        return [
            '<div class="node">',
            '  <div class="status ' + runningOrStopped + '">',
            runningOrStopped,
            '  </div>',
            node,
            '</div>'
        ].join('');
    };

    runningNodes = function () {
        var output = "";

        $.each(status.nodes, function () {
            var node = this.toString();
            if ($.inArray(node, status["running-nodes"]) > -1) {
                output = output + formatRunningNodes(node, "running");
                console.log(node + " is running");
            }          
            else {
                output = output + formatRunningNodes(node, "stopped");
                console.log(node + " is not running");
            }
        });
        return output;
    };

    $("#status").append('<div id="services">' +
                        '  <b>Running Services</b><br/>' +
                        runningApplications() +
                        '</div>');

    $("#status").append('<div id="nodes">' +
                        '  <h1>Nodes</h1>' +
                        runningNodes() +
                        '</div>');
};

// TODO: check queue count to add or remove
TRIXX.Views.Queue.refresh = function (queues) {
    var id, before, after, queue;
    $.each(queues, function () {
        queue = this;
        console.log("[TRIXX.Views.Queue.refresh] Queue=" + queue.name);

        $([{display: "consumers", value: "consumers"}, 
           {display: "transactions", value: "transactions"}, 
           {display: "memory", value: "memory"}, 
           {display: "total", value: "messages"},
           {display: "ready", value: "messages-ready"}, 
           {display: "unacknowledged", value: "messages-unacknowledged"},
           {display: "uncommitted", value: "messages-uncommitted"},
           {display: "acks-uncommitted", value: "acks-uncommitted"}]).each(function () {

            id = TRIXX.Utils.formatQueueId(queue, this.display);
            before = TRIXX.Utils.removeSpaces($("#" + id).text()); 
            after = queue[this.value];

            if (before !== after) {
                $("#" + id).text(after + "   ");
            }
        });
    });

    turnConsumerNumbeRedWhenCountZero = (function () {
        var count;
        $("strong[id*='-consumers']").each(function (idx, el) {
            count = $(el).text().replace(/^\s+|\s+$/g,""); 
            count === "0" ? $(el).css("color", "red") : $(el).css("color", "black");
        });
    }());
};

// TODO: Fix this, not clearing interval
TRIXX.Views.refresh = function () {
    var queueRefreshIntervalId, refreshQueue, pollInterval = 2; 

    refreshQueue = function () {
        TRIXX.Data.find(
            "queues", 
            null, 
            function () { 
                return $("option:selected").val(); 
            }, 
            TRIXX.Views.Queue.refresh);
    }; 

    try {
        queueRefreshIntervalId = setInterval(refreshQueue, pollInterval * 1000);
    } catch (e) {
        console.log("[TRIXX.Views.refresh] Unable to refresh.  Refresh id=" + queueRefreshIntervalId);
        clearInterval(queueRefreshIntervalId);
    }
};

$(document).ready(function () {
    TRIXX.Data.find("rabbit", "status", null, TRIXX.Views.Status.render);
    TRIXX.Data.find("vhosts", null,     null, TRIXX.Views.Vhost.render);
    TRIXX.Views.refresh();
});
