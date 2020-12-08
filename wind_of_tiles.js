var przmBaseUrl = 'https://proto-c2.autofaq.ai'

// Persistent toolbars
// http://view.jquerymobile.com/master/demos/toolbar-fixed-persistent/index.php
$(function() {
    $("[data-role='navbar']").navbar();
    $("[data-role='toolbar']").toolbar();
});

// Update the contents of the toolbars
$(document).on("pagecontainerchange", function() {
    console.log('pagecontainerchange');
    // Each of the four pages in this demo has a data-title attribute
    // which value is equal to the text of the nav button
    // For example, on first page: <div data-role="page" data-title="Info">
    var current = $(".ui-page-active").jqmData("title");
    // Change the heading
    $("[data-type='header'] h1").text(current);
    // Remove active class from nav buttons
    $("[data-role='navbar'] a.ui-button-active").removeClass("ui-button-active");
    // Add active class to current nav button
    $("[data-role='navbar'] a").each(function() {
        if ($(this).text() === current) {
            $(this).addClass("ui-button-active");
        }
    });
});


$(document).on("mobileinit", function() {
    // We want popups to cover the page behind them with a dark background
    $.mobile.popup.prototype.options.overlayTheme = "b";
    // Set a namespace for jQuery Mobile data attributes
    //$.mobile.ns = "jqm-";

});


$(document).ready(function() {
    getNewspaper()
    initNavHandlers()
});


function getNewspaper() {
    var s = window.filterString ? window.filterString : ''
    var gd = $('#slider-gd').val()
    var vatnik = $('#slider-vatnik').val()
    $('.topspinner').show();
    $.ajax({
        type: 'GET',
        url: `${przmBaseUrl}/newspaper?filter_text=${s}&gd=${gd}&vatnik=${vatnik}`,
        headers: {},
        success: function(data) {
            $('.topspinner').hide();
            // clear fast filer
            window.filterStringRegex = ''

            console.log('/newspaper articles: ', data.articles.length, 'stories: ', data.stories.length)
            console.log(data)
            renderEvents(data);
        },
        error: function(xhr, textStatus) {
            $('.topspinner').hide();
            console.error('no newspaper:', textStatus, xhr.statusCode())
        }
    })
}

function renderEvents(data) {

    window.articlesUrlIndex = {}
    articlesUrlStoryIndex = {}

    window.itemsList = [];
    _.each(data.articles, function(item) {
        if (!item.description) {
            item.description = ''
        }
        if (item.description.length) {

            item.text = highlightText(item.text, item.keywords)
            item.description = highlightText(item.description, item.keywords)
        }

        item.publish_date_m = moment(item.publish_date)
        if (!item.publish_date_m.isValid()) {
            console.warning('cannot parse datetime', item.publish_date)
        }

        window.articlesUrlIndex[item.url] = item

    });

    // crude junk filter
    data.articles = _.filter(data.articles, function(item) {
        return item.description.length + item.text.length > 90
    })


    // sort stories
    // data.stories = data.stories.sort(function(a, b) { return -1 * (a.urls.length - b.urls.length) });
    window.stories = _.map(data.stories, function(item, i) {
        _.each(item.urls, function(u) {
            var entry = articlesUrlStoryIndex[u]
            if (typeof entry == "undefined") {
                articlesUrlStoryIndex[u] = []
            }
            articlesUrlStoryIndex[u].push({ story: item, index: i })
        });
        return item
    });

    data.articles = data.articles.sort(function(a, b) {
        //if (a.publish_date_m.isSame(b.publish_date_m)) return 0;
        if (a.publish_date_m.isAfter(b.publish_date_m)) return -1;
        if (a.publish_date_m.isBefore(b.publish_date_m)) return 1;
        return 0;
    });

    /*
    var data_articles_count = data.articles.length
    var storiesFound = {}
    data.articles = _.filter(data.articles, function(a) {
        if (!articlesUrlStoryIndex[a.url]) return true;

        if (_.has(storiesFound, articlesUrlStoryIndex[a.url].index)) return false
        storiesFound[articlesUrlStoryIndex[a.url].index] = a
        return true
    });
    console.log('data.articles filtered ', data_articles_count, ' -> ', data.articles.length)
    */


    _.each(data.articles, function(item) {
        window.itemsList.push(compileArticle(item))
    })

    function compileArticle(article) {

        article.urls = []

        //var ar = _.find(articles, function(a) { return a.url === urls[0] })
        //var story = Object.assign({}, articlesUrlStoryIndex[u]);
        var e = articlesUrlStoryIndex[article.url];
        if (e) {
            article.urls = e[0].story.urls
        }

        //article.urls = urls; //.splice()
        return article
    }

    console.log('compiled cards count:', window.itemsList.length)


    var i = 0;
    //asyncRenderCards()
    syncRenderCards()


    function syncRenderCards() {
        // clear all holder elements
        $('#zcontent').html('')
        $('#zcontent').html('<div class="WindOfTiles"></div>')

        var html = ''
        var maxDateAgo = moment().subtract(30, 'days');
        var maxTiles = 512;
        while (i < Math.min(maxTiles, window.itemsList.length)) {
            html += renderDeckCard(itemsList[i], i)
            if (itemsList[i].publish_date_m.isBefore(maxDateAgo)) {
                console.log('stop render at ', i)
                break
            }
            i++
        }

        if (html.length) {
            $('.WindOfTiles').append(html)
            initLayout()
        } else {
            $('#zcontent').html('<img src="ui/not-found.gif" class="mx-auto my-5 img-rounded d-block" style="width:25rem" alt="">')
        }
    }


    function asyncRenderCards() {
        var item = window.itemsList[i]
        var html = renderDeckCard(item, i)
        console.log('asyncRenderCards #i', i)
        $('.WindOfTiles').append(html)

        if (i >= Math.min(1000, window.itemsList.length)) {
            initLayout()
            return;
        }
        i++;
        setTimeout(asyncRenderCards, 50)
    }
}


function createTiles() {
    $('.WindOfTiles').isotope({
        itemSelector: '.grid-item',
        layoutMode: 'fitRows',

        filter: function() {
            if (!window.filterStringRegex) return true;
            return $(this).text().match(window.filterStringRegex);
        },

        masonry: {
            //columnWidth: '.grid-sizer',
            //gutterWidth: 10,
            //"gutter": 10
        }
    });
}


function initLayout() {

    createTiles()
    fixIsotopeLayoutIssues()

    $('.card-tile-np').on('click', function(e) {
        var idx = $(this).data().itemindex
        console.log('idx', idx);
        var article = window.itemsList[idx]
        $('#popupTileTitle').html(
            `<a href="${article.url}" >${article.title}</a>`
        )

        var popupDialogBody = `<div>${article.text}</div>`;
        _.each(article.urls, function(u) {
            var a = window.articlesUrlIndex[u]
            if (!a) return;
            popupDialogBody += `<h5>
                <div>${getSitename(a)} <a href="${a.url}" style="font-weight: 100;>${a.title}</a></div>
                <div>${a.description}</div>
            </h5>`
        })
        $('#popupTileText').html(popupDialogBody)
        $("#popupTileContent").popup("open", { transition: 'pop', role: 'dialog' });
    })


    $('.feedback-label').on('click', function(e) {
        e.stopPropagation()
        var idx = $(this).data().itemindex;
        var article = window.itemsList[idx]
        apiPost('/api/v1/learn/labels', { url: article.url, label: $(this).data().label }, (response) => {
            popupNotice('thx! smarter with evey click')
        });
        $('.feedback-label').each(function(index) {
            if ($(this).data().itemindex === idx) {
                $(this).hide()
            }
        });
    })
}

function getHostName(url) {
    var match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);
    if (match != null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0) {
        return match[2];
    } else {
        return null;
    }
}

function getSitename(item) {
    return item['og:site_name'] || getHostName(item.url)
}

function renderDeckCard(item, i) {

    var sourcesTemplate = ''
    if (item.urls.length) {

        var sourcesNames = ''
        _.each(item.urls, function(u) {
            var a = window.articlesUrlIndex[u]
            if (!a) return;
            sourcesNames += `<div><a href="${a.url}" style="font-weight: 100;">${getSitename(a)}</a></div>`
        })

        var sourcesTemplate = `<p class="text-secondary" style="font-weight: 100;">${sourcesNames}</p>`
    }

    var siteName = getSitename(item)

    var template = `
    <div class="card bg-light mb-5 ml-0 card-tile-np" data-itemindex="${i}" style="max-width: 95%; cursor: pointer;">
 
       <img class="card-img-top" src="${item.top_image}" alt="">
       <div class="card-img-overlay-">


        <div class="card-header">${item.title}</div>
            <div class="card-body text-secondary">
            
            <p class="card-text">${item.description || item.text || ''}</p>
            
            ${sourcesTemplate}

            <button class="btn btn-outline-secondary feedback-label ml-5 btn-sm" type="button" data-label="glamour" data-itemindex="${i}">это гламур</button>
            <button class="btn btn-outline-secondary feedback-label ml-2 btn-sm" type="button" data-label="discourse" data-itemindex="${i}">это дискурс</button>

            <div class="card-footer bg-transparent border-success">
                <i class="fa fa-calendar-alt"></i>                 
                <a href="${item.url}" class="text-secondary" style="font-weight: 100;">
                ${siteName} ${moment(item.publish_date).format('D.M.YYYY, HH:mm')}
                </a>
            </div>

        </div>
        </div>
    </div>
    `
    return `<div class="grid-item" >${template}</div>`
}


function highlightText(text, keywords) {
    // TODO add keyword->regex cache
    _.each(keywords, function(keyword) {
        if (keyword.length < 3) return;
        //var regexp = new RegExp(`\b${keyword}\b`, "ig")
        //text = text.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), `<b>${keyword}</b>`)
        text = text.replace(new RegExp(`${keyword}`, 'gi'), `<b>${keyword}</b>`)
    })
    return text
}


function updateFeed(search) {
    search = search || '';
    console.log('updateFeed search:', search)

    // fast filter
    window.filterString = search
    window.filterStringRegex = new RegExp(window.filterString, 'gi');
    $('.WindOfTiles').isotope();

    // slow backend query filter
    getNewspaper()
}

function initNavHandlers() {

    $('.toolbar-search').on('click', function(e) {
        console.log(e)
        console.log('search', $(this).data().itemindex)

        // https://sweetalert2.github.io/#examples
        bootbox.prompt({
            title: ' ',
            inputType: 'text',
            callback: function(result) {
                if (!result) return
                console.log('result', result)
                updateFeed(result)
            }
        });
    })

    $('.toolbar-add-site').on('click', function(e) {
        bootbox.prompt({
            title: 'Add Site or RSS feed',
            inputType: 'text',
            callback: function(result) {
                if (!result) return
                apiPost('/api/v1/sources', { source: result }, (response) => {
                    popupNotice('Thanks! Content updates are comming soon.')
                });
            }
        });
    })

    $('.about').on('click', function(e) {
        $.ajax({
            type: 'GET',
            url: `${przmBaseUrl}/api/v1/sources`,
            headers: {},
            success: function(data) {
                console.log(data)
                var html = ''
                _.each(data.sources, item => {
                    html += `<li>${item}</li>`
                })
                var message = `<h5>Sources:</h5> <ul>${html}</ul>`
                bootbox.alert({ title: 'About', message: message })
            },
            error: function(xhr, textStatus) {
                console.error(textStatus, xhr.responseJSON)
                popupNotice(`error ${xhr.responseJSON}`)
            }
        })
    })

    var onFilterPanelChanges = _.debounce(function() {
        updateFeed($('#search-1').val())
    }, 400)

    $('#search-1').on('keyup', onFilterPanelChanges)
    $('#slider-gd').change(onFilterPanelChanges)
    $('#slider-vatnik').change(onFilterPanelChanges)


    $(document).on('keyup', _.debounce(function(e) {
        // hotkeys
        if (_.find(['s', 'S', 'ы', '/'], v => v === e.key)) {
            if (!$("#creative_panel").hasClass('ui-panel-open')) {
                $("#creative_panel").panel("toggle");
            }
        }
    }, 300))

    $("#creative_panel").on("panelopen", function(event, ui) {
        console.log('panelopen')
        $('.full-width-slider input').hide()
        $('#search-1').focus()
    });
    $("#creative_panel").on("panelclose", function(event, ui) {
        console.log('panelclose')
        $('#search-1').blur()
    });

    // prototype functionality warning 
    $('.ui-slider').attr('title', 'Need more training data')
    new jBox('Tooltip', { attach: '.ui-slider' });
}

function apiPost(urlPath, data, callback) {
    $.ajax({
        type: 'POST',
        url: `${przmBaseUrl}${urlPath}`,
        data: JSON.stringify(data),
        headers: {},
        contentType: "application/json",
        dataType: 'json',
        success: callback,
        error: function(xhr, textStatus) {
            console.error(textStatus, xhr.responseJSON)
            bootbox.alert({ title: 'error', message: `error ${xhr.responseJSON}` })
        }
    })

}

function popupNotice(message) {
    new jBox("Notice", {
        content: message,
        theme: "NoticeFancy",
        attributes: {
            x: "left",
            y: "bottom"
        },
        color: 'yellow',
        audio: "https://cdn.jsdelivr.net/gh/StephanWagner/jBox@latest/assets/audio/bling2",
        volume: 5,
        animation: {
            open: "slide:bottom",
            close: "slide:left"
        }
    })
}

function fixIsotopeLayoutIssues() {
    // fix isotope lib layout bugs
    function updateIsotopeLayout() {
        if (window.itemsList.length)
            $('.WindOfTiles').isotope('layout');
    }
    setTimeout(updateIsotopeLayout, 3000)
    setTimeout(updateIsotopeLayout, 5000)
    setTimeout(updateIsotopeLayout, 7000)
}