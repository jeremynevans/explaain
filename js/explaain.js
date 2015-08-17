function clog(myText) {
    console.log(myText);
};

function clogyo() {
    console.log('Yo');
};


var ctrlKeyDown = false;



var app = angular.module('app', ['firebase', 'ngMaterial', 'algoliasearch', 'ngRoute', 'ngSanitize']).
controller('ExplaainCtrl', function($scope, $timeout, $firebaseArray, $firebaseObject, $http, $mdToast, $mdSidenav, algolia) {



    var clientAlgolia = algoliasearch('RR6V7DE8C8', 'b96680f1343093d8822d98eb58ef0d6b');
    var indexAlgolia = clientAlgolia.initIndex(algoliaIndex);

    $scope.localCards = [];
    //Remember the positions of objects in the $scope.cards array don't match up to the positions of objects in the $scope.localCards array
    $scope.localCardRefs = {};

    var firebaseRef = new Firebase(firebaseRoot);
    var firebaseCardsRef = firebaseRef.child("cards");
    $scope.globalCards = $firebaseArray(firebaseCardsRef);


    var keywordsRef = new Firebase(firebaseRoot + "/keywords");
    $scope.keywords = $firebaseArray(keywordsRef);

    $scope.frontCard;
    $scope.editMode = false;

    $scope.showingFilter = function(card) {
        var localCardRef = $scope.localCardRefs[card.$id];
        return localCardRef.showing;
    };

    $scope.importCard = function(key, firstCard) {
        var tempCardsRef = new Firebase(firebaseRoot + "/cards/" + key);
        var newCard = $firebaseObject(tempCardsRef);
        if (firstCard) {
            newCard.$loaded().then(function(data) {
                var element = document.getElementById("spinner");
                element.parentNode.removeChild(element);
            });
        }
        $scope.localCards.push(newCard);
        $scope.localCardRefs[key] = {};
        $scope.localCardRefs[key].ref = $scope.localCards.length - 1;
        $scope.localCardRefs[key].keywords = $scope.getCardKeywords(key);
        return $scope.localCardRefs[key];
    };

    $scope.reImportCard = function(key) {
        var tempCardsRef = new Firebase(firebaseRoot + "/cards/" + key);
        var card = $scope.localCards[$scope.localCardRefs[key]];
        // $scope.localCardRefs[key].keywords = $scope.getCardKeywords(key);
        card = $firebaseObject(tempCardsRef);
    };

    $scope.cardImported = function(key) {
        if ($scope.localCardRefs[key] !== undefined) {
            console.log('The card ' + key + ' is imported');
            return true;
        }
        else {
            return false;
        }
    };

    $scope.getCardKeywords = function(key) {
        var cardKeywords = [];
        tempScopeKeywordsRef.orderByChild("ref").equalTo(key).on("child_added", function(snapshot) {
            var keyword = snapshot.val();
            keyword.$id = snapshot.key();
            cardKeywords.push(keyword);
        });
        return cardKeywords;
    };

    $scope.open = function(key, firstCard) {
        var localCardRef = $scope.localCardRefs[key];
        if (localCardRef === undefined) {
            localCardRef = $scope.importCard(key, firstCard);
        }
        var card = $scope.localCards[localCardRef.ref];
        for (var i = 0; i < $scope.localCards.length; i++) {
            $scope.localCards[i].atFront = false;
        }
        localCardRef.showing = true;
        localCardRef.atFront = true;
        localCardRef.editing = false;
        return card;
    };

    $scope.close = function(card) {
        var localCardRef = $scope.localCardRefs[card.$id];
        localCardRef.showing = false;
        localCardRef.atFront = false;
    };

    $scope.toggleEditMode = function() {
        $scope.editMode = !$scope.editMode;
        if ($scope.editMode) {
            $scope.showSimpleToast("Edit mode is on");
        }
        else {
            $scope.showSimpleToast("Edit mode is off");
        }
    };

    $scope.toggleEditCard = function(card) {
        var localCardRef = $scope.localCardRefs[card.$id];

        if (localCardRef.editing === undefined) {
            localCardRef.editing = true;
        }
        else {
            localCardRef.editing = !localCardRef.editing;
        }
    };

    $scope.addNewCard = function(card, open, justCreated, autoPopulate) {
        if (card.title === undefined) {
            card.title = '';
        }
        if (card.bio === undefined) {
            card.bio = {};
            card.bio.value = "";
        }
        card.bio.structure = [];
        card.bio.structure = $scope.structureBio(-1, card.bio.value, $scope.orderedKeywords);

        card.id = card.title.replace(" ", "-").toLowerCase();


        $scope.globalCards.$add(card).then(function(ref) {
            var key = ref.key();
            if (card.title.length > 0) {
                $scope.showSimpleToast("Success! You've added a new card called " + card.title);
            }
            else {
                $scope.showSimpleToast("Success! You've added a new card.");
            }
            if (open) {
                $scope.open(key);
            }

            var localCardRef = $scope.localCardRefs[key];
            localCardRef.showing = true;
            localCardRef.atFront = true;
            localCardRef.editing = true;

            var newkeyword = {
                keyword: card.title,
                ref: key
            };
            $scope.addNewKeyword(newkeyword, false);

            $scope.algoliaAdd(card);
        });
    };

    $scope.populateFromWikipedia = function(card, inScope) {
        var title = card.title;
        $http.jsonp('https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&lllimit=500&titles=' + title + '&callback=JSON_CALLBACK&formatversion=2').
        success(function(data) {
            if (card.bio === undefined) {
                card.bio = {};
            }
            card.bio.value = nSentencesMChars(htmlToPlaintext(data.query.pages[0].extract), 2, 450);
            $http.jsonp('https://en.wikipedia.org/w/api.php?&format=json&&callback=JSON_CALLBACK&formatversion=2&action=query&titles=' + title + '&prop=pageimages&format=json&pithumbsize=200').
            success(function(data) {
                if (card.image === undefined) {
                    card.image = {};
                }
                card.image.value = data.query.pages[0].thumbnail.source;
                if (inScope) {
                    $scope.card = card; //Not sure how this works or whether it's necessary
                }
                else {
                    return card;
                }
            });
        });
    };

    function htmlToPlaintext(text) {
        // var text1 = String(text).replace(/<[^>]+>.<[^>]+>|<[^>]+>/gm, '');
        var text1 = String(text).replace(/<[^>]+>.<[^>]+>|\s\s+/gm, ' ').replace(/<[^>]+>|\;|\(.*\) |\(.*\)/gm, '').replace(/<[^>]+>.<[^>]+>|\s\s+/gm, ' ').replace('( ', '(');
        return text1.replace('&crarr;', ' ');
    }

    function nSentencesMChars(text, n, m) {
        var maxChars = text.substring(0, m);
        var split = maxChars.split(". ");
        var shorterSplit;
        for (var i = n; i > 0; i--) {
            shorterSplit = split.slice(0, i);
            if (shorterSplit.length < split.length) {
                return shorterSplit.join(". ") + ".";
            }
        }
        return shorterSplit.join(". ") + "...";
    }


    $scope.structureBio = function(id, bio, keywords) {
        var structuredBio = [{
            text: bio,
            type: 'span'
        }];

        for (var j = 0; j < keywords.length; j++) {
            if (id == -1 || keywords[j].ref != id) {
                for (var k = 0; k < structuredBio.length;) {
                    if (structuredBio[k].type != 'link') {
                        var text = structuredBio[k].text
                        var splitSection = text.split(keywords[j].keyword);
                        if (splitSection.length > 0) {
                            var insert = [];
                            for (var m = 0; m < splitSection.length; m++) {
                                insert[2 * m] = {
                                    type: 'span',
                                    text: splitSection[m]
                                };
                                insert[2 * m + 1] = {
                                    type: 'link',
                                    text: keywords[j].keyword,
                                    ref: keywords[j].ref
                                };
                            }
                            insert.pop(); //Remove the very last element
                            var newBio = structuredBio.slice(0, k);
                            newBio = newBio.concat(insert);
                            newBio = newBio.concat(structuredBio.slice(k + 1, structuredBio.length));
                            structuredBio = newBio;
                            k += insert.length - 1;
                        }
                    }
                    k++;
                }
            }
        }
        return structuredBio;
    };

    $scope.appendKeyword = function(keyword, card) {
        var newkeyword = {
            keyword: keyword,
            ref: card.$id
        };
        $scope.addNewKeyword(newkeyword, true);
        $scope.localCardRefs[card.$id].keywords[$scope.localCardRefs[card.$id].keywords.length - 1].pop(); //This shouldn't be necessary, it's because two new ones are created. Not even sure which one gets deleted!
        return newkeyword;
    }

    $scope.addNewKeyword = function(newkeyword, showToast) {
        if (newkeyword.keyword.length < 1) {
            return;
        }
        newkeyword.keywordLength = newkeyword.keyword.length * -1;
        $scope.keywords.$add(newkeyword).then(function(ref) {
            $scope.updateBiosFromKeyword(newkeyword);
            if (showToast) {
                $scope.showSimpleToast("Success! You've added the keyword \"" + newkeyword.keyword + "\"");
            }
        });
    };

    $scope.deleteKeyword = function(key) {
        var keywordToDelete = $scope.keywords.$getRecord(key);
        var tempKeyword = keywordToDelete;
        $scope.keywords.$remove(keywordToDelete).then(function(ref) {
            $scope.updateBiosFromKeyword(tempKeyword);
            $scope.showSimpleToast("Success! You've deleted the keyword \"" + tempKeyword.keyword + "\"");
        });
    };

    $scope.deleteCardKeywords = function(key) {
        var tempKeywordsRef = new Firebase(firebaseRoot + "/keywords");
        tempKeywordsRef.orderByChild("ref").equalTo(key).on("child_added", function(snapshot) {
            $scope.deleteKeyword(snapshot.key());
        });
    };

    $scope.reorderKeywords = function(callback) {
        $scope.orderedKeywords = [];
        tempScopeKeywordsRef.orderByChild("keywordLength").on("child_added", function(snapshot) {
            $scope.orderedKeywords.push(snapshot.val());
            if (callback && typeof(callback) === "function") {
                callback();
            }
        });
    };

    $scope.updateBiosFromKeyword = function(keyword) {
        //Should this use Algolia to search through bios?
        //Slightly updated now we have localCards, but still not quite right
        $scope.reorderKeywords(); //Need a callback here to finish this before proceeding
        for (var i = 0; i < $scope.globalCards.length; i++) {
            var bio = $scope.globalCards[i].bio.value;
            if (bio.indexOf(keyword.keyword) != -1) {
                $scope.globalCards[i].bio.structure = $scope.structureBio($scope.globalCards.$keyAt(i), bio, $scope.orderedKeywords);
                $scope.globalCards.$save(i).then(function(ref) {
                    var key = ref.key();
                    if ($scope.cardImported(key)) {
                        $scope.reImportCard(key);
                    }
                });
            }
        }
    };

    $scope.updateAllBios = function() {
        //Slightly updated now we have localCards, but still not quite right
        var successCount = 0;
        $scope.reorderKeywords(); //Need a callback here to finish this before proceeding
        var allCards = $firebaseArray(firebaseCardsRef);
        for (var i = 0; i < allCards.length; i++) {
            allCards[i].editing = false;
            allCards[i].justCreated = false;
            var bio = allCards[i].bio.value;
            allCards[i].bio.structure = $scope.structureBio(allCards.$keyAt(i), bio, $scope.orderedKeywords);

            allCards.$save(i).then(function(ref) {
                var key = ref.key();
                successCount++;
                if ($scope.cardImported(key)) {
                    $scope.reImportCard(key);
                }
                if (successCount == allCards.length) {
                    $scope.showSimpleToast("Success! You've updated all cards.");
                }
            });
        }
    };

    $scope.updateAllKeywords = function() {
        for (var i = 0; i < $scope.keywords.length; i++) {
            $scope.keywords[i].keywordLength = $scope.keywords[i].keyword.length * -1;
            $scope.keywords.$save(i);
            if ($scope.globalCards.$getRecord($scope.keywords[i].ref) === null) {
                $scope.keywords.$remove(i);
            }
        }
    };

    $scope.updateEverything = function() {
        //All of this needs callbacks
        $scope.updateAllKeywords();
        $scope.updateAllBios();
        // $scope.reorderKeywords($scope.updateAllBios);
        if (ctrlKeyDown) {
            $scope.reImportToAlgolia();
        }
    };

    $scope.updateCard = function(key, card) {
        var localCardRef = $scope.localCardRefs[key];
        var index = $scope.globalCards.$indexFor(key);
        $scope.globalCards[index] = card;
        card.bio.structure = $scope.structureBio(-1, card.bio.value, $scope.orderedKeywords);
        $scope.globalCards.$save(card).then(function(ref) {
            localCardRef.editing = false;
            $scope.algoliaUpdate(key, card);
            $scope.showSimpleToast("Success! You've updated the card " + card.title);
        });
    };

    $scope.deleteCard = function(key, card) {
        var title = card.title;
            console.log(1);
        var index = $scope.globalCards.$indexFor(key);
            console.log(2);
        $scope.globalCards[index] = card;
            console.log(3);
        $scope.localCards.splice($scope.localCardRefs[key].ref, 1);
            console.log(4);
        $scope.globalCards.$remove(card).then(function(ref) {
            console.log(1);
            $scope.deleteCardKeywords(key);
            console.log(2);
            $scope.algoliaDelete(key);
            console.log(3);
            $scope.showSimpleToast("Success! You've deleted the card " + title);
        });
    };

    $scope.toastPosition = {
        bottom: false,
        top: true,
        left: false,
        right: true
    };

    $scope.toggleSidenav = function(menuId) {
        $mdSidenav(menuId).toggle();
    };

    $scope.getToastPosition = function() {
        return Object.keys($scope.toastPosition)
            .filter(function(pos) {
                return $scope.toastPosition[pos];
            })
            .join(' ');
    };


    $scope.showSimpleToast = function(message) {
        var toastPosition = {
            bottom: false,
            top: true,
            left: false,
            right: true
        };
        $mdToast.show(
            $mdToast.simple()
            .content(message)
            .position($scope.getToastPosition())
            .hideDelay(3000)
        );
    };


    function getSelectedText() {
        var text = "";
        if (typeof window.getSelection != "undefined") {
            text = window.getSelection().toString();
        }
        else if (typeof document.selection != "undefined" && document.selection.type == "Text") {
            text = document.selection.createRange().text;
        }
        return text;
    }

    $scope.createCardFromSelection = function($event, autoPopulate) {
        clog('creating card');
        var selectedText = getSelectedText();
        if (selectedText) {
            var newCard = {
                title: selectedText
            };
            $scope.addNewCard(newCard, true, true, autoPopulate);
        }
    };




    window.onkeydown = function(event) {
        ctrlKeyDown = event.ctrlKey;
    };

    window.onkeyup = function(event) {
        ctrlKeyDown = event.ctrlKey;
    };
    
    
    

    document.onkeyup = function(event) {
        if (event.keyCode == 67 && !ctrlKeyDown) {
            $scope.createCardFromSelection(event, -1);
        }
        else if (event.keyCode == 87) {
            // $scope.createCardFromSelection(event, 'wikipedia');
        }
    };

    // $scope.editingCard = function(card) {
    //     if (card.justCreated === true) {
    //         card.justCreated = false;
    //         return true;
    //     }
    //     else {
    //         return false;
    //     }
    // };




    $scope.reImportToAlgolia = function() { //Use this VERY RARELY!!!!!
        // Get all data from Firebase
        firebaseCardsRef.on('value', reindexIndex);

        function reindexIndex(dataSnapshot) {
            // Array of objects to index
            var objectsToIndex = [];

            // Create a temp index
            var tempIndexName = 'cards_temp';
            var tempIndex = clientAlgolia.initIndex(tempIndexName);

            // Get all objects
            var values = dataSnapshot.val();

            // Process each Firebase object
            for (var key in values) {
                if (values.hasOwnProperty(key)) {
                    // Get current Firebase object
                    var firebaseObject = values[key];

                    // Specify Algolia's objectID using the Firebase object key
                    firebaseObject.objectID = key;

                    // Add object for indexing
                    objectsToIndex.push(firebaseObject);
                }
            }

            // Add or update new objects
            indexAlgolia.saveObjects(objectsToIndex, function(err, content) {
                if (err) {
                    throw err;
                }

                // Overwrite main index with temp index
                clientAlgolia.moveIndex(tempIndexName, 'cards', function(err, content) {
                    if (err) {
                        throw err;
                    }

                    console.log('Firebase<>Algolia reimport done');
                });
            });
        }
    }



    $scope.algoliaAdd = function(card) {
        var myObjectID = card.$id;
        indexAlgolia.addObject(card, myObjectID, function(err, content) {
            console.log('Algolia - added card:');
            console.log(card);
        });
    };

    $scope.algoliaUpdate = function(key, card) {
        console.log(card);
        console.log(key);
        card.objectID = key;
        card.$$conf = null; //Probably not necessary to delete all of this (only to prevent "TypeError: Converting circular structure to JSON" error)
        indexAlgolia.saveObject(card, function(err, content) {
            console.log('Algolia - updated card:');
            // console.log(card);
        });
    };

    $scope.algoliaDelete = function(key) {
        indexAlgolia.deleteObject(key, function(error) {
            if (!error) {
                console.log('Algolia - deleted card:');
            }
        });
    };



    //Algolia Search

    $scope.hits = [];
    $scope.query = '';
    $scope.initRun = true;
    $scope.search = function() {
        indexAlgolia.search($scope.query, {
                hitsPerPage: 20
            },
            function(err, content) {
                if (err || $scope.query != content.query) {
                    clog('error');
                    return;
                }
                $scope.hits = content.hits;
                if ($scope.initRun) {
                    $scope.$apply();
                    $scope.initRun = false;
                }
            });
    };
    $scope.search();




    //Create $scope.orderedKeywords
    $scope.orderedKeywords = [];
    var tempScopeKeywordsRef = new Firebase(firebaseRoot + "/keywords");
    $scope.reorderKeywords();


    //Open first card
    var tempCard1 = $scope.open(initialCard, true);
    tempCard1.editing = false;

});

app.directive('ngCard', function() {
    return {
        restrict: 'E',
        require: 'ExplaainCtrl',
        templateUrl: 'html/card.html'
    }
});

app.directive('ngBio', function() {
    return {
        restrict: 'E',
        require: 'ExplaainCtrl',
        templateUrl: 'html/bio.html'
    }
});

app.directive('ngCardSearch', function() {
    return {
        restrict: 'E',
        require: 'ExplaainCtrl',
        templateUrl: 'html/card_search.html'
    }
});
