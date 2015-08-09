function clog(myText) {
    console.log(myText);
};


var app = angular.module('app', ['firebase', 'ngMaterial', 'algoliasearch', 'ngRoute', 'ngSanitize']).
controller('ExplaainCtrl', function($scope, $timeout, $firebaseArray, $firebaseObject, $http, $mdToast, $mdSidenav, algolia) {





    var singleCardRef = new Firebase(firebaseRoot + "/cards/-Jtu1T1dCkU7cgdVh-I9");

    // var algoliasearch = require('algoliasearch'); //For some reason this is here but should remain commented as it doesn't seem to work!
    var client = algoliasearch('RR6V7DE8C8', 'b96680f1343093d8822d98eb58ef0d6b');
    var index = client.initIndex(algoliaIndex);

    singleCardRef.once("value", function(snap) {
        clog("initial data loaded!");
        clog($firebaseObject(singleCardRef));
        var element = document.getElementById("spinner");
        element.parentNode.removeChild(element);
        $scope.localCards[0] = $firebaseObject(singleCardRef);
        $scope.localCardRefs[$scope.localCards[0].$id] = {};
        $scope.localCardRefs[$scope.localCards[0].$id].ref = 0;
        $scope.localCardRefs[$scope.localCards[0].$id].showing = true;
        $scope.localCardRefs[$scope.localCards[0].$id].atFront = true;
        $scope.localCardRefs[$scope.localCards[0].$id].editing = false;
    });
    $scope.localCards = [];
    //Remember the positions of objects in the $scope.cards array don't match up to the positions of objects in the $scope.localCards array
    $scope.localCardRefs = {};

    var cardsRef = new Firebase(firebaseRoot + "/cards");
    $scope.cards = $firebaseArray(cardsRef);
    var keywordsRef = new Firebase(firebaseRoot + "/keywords");
    $scope.keywords = $firebaseArray(keywordsRef);
    
    $scope.orderedKeywords = [];
    var tempScopeKeywordsRef = new Firebase(firebaseRoot + "/keywords");
    tempScopeKeywordsRef.orderByChild("keywordLength").on("child_added", function(snapshot) {
        $scope.orderedKeywords.push(snapshot.val());
    });

    $scope.frontCard;
    $scope.editMode = false;

    $scope.showingFilter = function(card) {
        var localCardRef = $scope.localCardRefs[card.$id];
        return localCardRef.showing;
    };

    $scope.importCard = function(key) {
        var tempCardsRef = new Firebase(firebaseRoot + "/cards/" + key);
        $scope.localCards.push($firebaseObject(tempCardsRef));
        $scope.localCardRefs[key] = {};
        $scope.localCardRefs[key].ref = $scope.localCards.length - 1;
        $scope.localCardRefs[key].keywords = $scope.getCardKeywords(key);
        clog($scope.localCardRefs);
        return $scope.localCardRefs[key];
    };

    $scope.reImportCard = function(key) {
        var tempCardsRef = new Firebase(firebaseRoot + "/cards/" + key);
        var card = $scope.localCards[$scope.localCardRefs[key]];
        $scope.localCardRefs[key].keywords = $scope.getCardKeywords(key);
        card = $firebaseObject(tempCardsRef);
    };
    
    $scope.getCardKeywords = function(key) {
        var cardKeywords = [];
        tempScopeKeywordsRef.orderByChild("ref").equalTo(key).on("child_added", function(snapshot) {
            cardKeywords.push(snapshot.val());
        });
        return cardKeywords;
    };

    $scope.open = function(key) {
        var localCardRef = $scope.localCardRefs[key];
        if (localCardRef === undefined) {
            localCardRef = $scope.importCard(key);
        }
        var card = $scope.localCards[localCardRef.ref];
        for (var i = 0; i < $scope.localCards.length; i++) {
            $scope.localCards[i].atFront = false;
        }
        localCardRef.showing = true;
        localCardRef.atFront = true;
        localCardRef.editing = false;
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

        $scope.cards.$add(card).then(function(ref) {
            var key = ref.key();
            var newCard = $scope.cards[$scope.cards.$indexFor(key)]; // returns location in the array
            if (card.title.length > 0) {
                $scope.showSimpleToast("Success! You've added a new card called " + card.title);
            }
            else {
                $scope.showSimpleToast("Success! You've added a new card.");
            }
            if (open) {
                $scope.open(key);
            }

            var localCardRef = $scope.localCardRefs[newCard.$id];
            localCardRef.showing = true;
            localCardRef.atFront = false;
            // localCardRef.editing = editing;

            var newkeyword = {
                keyword: card.title,
                ref: key
            };
            $scope.addNewKeyword(newkeyword, false);
            if (autoPopulate == 'wikipedia') {
                localCardRef.editing = false;
            }
            else {
                localCardRef.editing = true;
            }
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

    $scope.addNewKeyword = function(newkeyword, showToast) {
        if (newkeyword.keyword.length < 2) {
            return;
        }
        newkeyword.keywordLength = newkeyword.keyword.length * -1;
        $scope.keywords.$add(newkeyword).then(function(ref) {
            var id = ref.key();
            $scope.keywords.$indexFor(id); // returns location in the array
            $scope.updateBios(newkeyword);
            if (showToast) {
                $scope.showSimpleToast("Success! You've added the keyword \"" + newkeyword.keyword + "\"");
            }
        });
    };

    $scope.deleteKeyword = function(key) {
        var keywordToDelete = $scope.keywords.$getRecord(key);
        var tempKeyword = keywordToDelete;
        $scope.keywords.$remove(keywordToDelete).then(function(ref) {
            $scope.updateBios(tempKeyword);
            $scope.showSimpleToast("Success! You've deleted the keyword \"" + tempKeyword.keyword + "\"");
        });
    };

    $scope.deleteCardKeywords = function(key) {
        var tempKeywordsRef = new Firebase(firebaseRoot + "/keywords");
        tempKeywordsRef.orderByChild("ref").equalTo(key).on("child_added", function(snapshot) {
            $scope.deleteKeyword(snapshot.key());
        });
    };

    $scope.updateBios = function(keyword) {
        //Needs updating now we have localCards!
        for (var i = 0; i < $scope.cards.length; i++) {
            var bio = $scope.cards[i].bio.value;
            if (bio.indexOf(keyword.keyword) != -1) {
                $scope.cards[i].bio.structure = $scope.structureBio($scope.cards.$keyAt(i), bio, $scope.keywords);
                $scope.cards.$save(i).then(function(ref) {
                    $scope.reImportCard($scope.cards[i].$id);
                });
            }
        }
    };

    $scope.updateAllBios = function() {
        //Needs updating now we have localCards!
        var successCount = 0;
        for (var i = 0; i < $scope.cards.length; i++) {
            $scope.cards[i].editing = false;
            $scope.cards[i].justCreated = false;
            $scope.cards[i].showing = Math.round(Math.random() * 10 / 19);
            var bio = $scope.cards[i].bio.value;
            $scope.cards[i].bio.structure = $scope.structureBio($scope.cards.$keyAt(i), bio, $scope.orderedKeywords);

            $scope.cards.$save(i).then(function(ref) {
                successCount++;
                $scope.reImportCard($scope.cards[i].$id);
                if (successCount == $scope.cards.length) {
                    $scope.showSimpleToast("Success! You've updated all cards.");
                }
            });
        }
    };

    $scope.updateAllKeywords = function() {
        for (var i = 0; i < $scope.keywords.length; i++) {
            $scope.keywords[i].keywordLength = $scope.keywords[i].keyword.length * -1;
            $scope.keywords.$save(i);
            if ($scope.cards.$getRecord($scope.keywords[i].ref) === null) {
                $scope.keywords.$remove(i);
            }
        }
    };

    $scope.updateEverything = function() {
        $scope.updateAllBios();
        $scope.updateAllKeywords();
        $scope.reImportToAlgolia();
    };

    $scope.updateCard = function(key, card) {
        var localCardRef = $scope.localCardRefs[key];
        var index = $scope.cards.$indexFor(key);
        $scope.cards[index] = card;
        card.bio.structure = $scope.structureBio(-1, card.bio.value, $scope.orderedKeywords);
        $scope.cards.$save(card).then(function(ref) {
            localCardRef.editing = false;
            $scope.showSimpleToast("Success! You've updated the card " + card.title);
        });
    };

    $scope.deleteCard = function(key, card) {
        var title = card.title;
        var index = $scope.cards.$indexFor(key);
        $scope.cards[index] = card;
        $scope.localCards.splice($scope.localCardRefs[key].ref, 1);
        $scope.cards.$remove(card).then(function(ref) {
            $scope.deleteCardKeywords(key);
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

    document.onkeyup = function($event) {
        if (event.keyCode == 67) {
            $scope.createCardFromSelection($event, -1);
        }
        else if (event.keyCode == 87) {
            // $scope.createCardFromSelection($event, 'wikipedia');
        }
    }

    // $scope.editingCard = function(card) {
    //     if (card.justCreated === true) {
    //         card.justCreated = false;
    //         return true;
    //     }
    //     else {
    //         return false;
    //     }
    // };




    $scope.reImportToAlgolia = function() {
        // Get all data from Firebase
        cardsRef.on('value', reindexIndex);

        function reindexIndex(dataSnapshot) {
            // Array of objects to index
            var objectsToIndex = [];

            // Create a temp index
            var tempIndexName = 'cards_temp';
            var tempIndex = client.initIndex(tempIndexName);

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
            index.saveObjects(objectsToIndex, function(err, content) {
                if (err) {
                    throw err;
                }

                // Overwrite main index with temp index
                client.moveIndex(tempIndexName, 'cards', function(err, content) {
                    if (err) {
                        throw err;
                    }

                    console.log('Firebase<>Algolia reimport done');
                });
            });
        }
    }


    // Listen for changes to Firebase data
    cardsRef.on('child_added', addOrUpdateObject);
    cardsRef.on('child_changed', addOrUpdateObject);

    function addOrUpdateObject(dataSnapshot) {
        clog('add');
        // Get Firebase object
        var firebaseObject = dataSnapshot.val();

        // Specify Algolia's objectID using the Firebase object key
        firebaseObject.objectID = dataSnapshot.key();

        // Add or update object
        index.saveObject(firebaseObject, function(err, content) {
            if (err) {
                throw err;
            }

            console.log('Firebase<>Algolia object saved');
        });
    }



    // Listen for changes to Firebase data
    cardsRef.on('child_removed', removeIndex);

    function removeIndex(dataSnapshot) {
        clog('remove');
        // Get Algolia's objectID from the Firebase object key
        var objectID = dataSnapshot.key();

        // Remove the object from Algolia
        index.deleteObject(objectID, function(err, content) {
            if (err) {
                throw err;
            }

            console.log('Firebase<>Algolia object deleted');
        });
    }





    //Algolia Search

    $scope.hits = [];
    $scope.query = '';
    $scope.initRun = true;
    $scope.search = function() {
        index.search($scope.query, {
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
