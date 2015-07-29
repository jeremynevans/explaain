var app = angular.module('app', ['firebase', 'ngMaterial', 'algoliasearch', 'ngRoute', 'ngSanitize']).
controller('ExplaainCtrl', function($scope, $firebaseArray, $http, $mdToast, $mdSidenav, algolia) {
    
    $scope.clog = function(myText) {
        console.log(myText);
    };
    
    
    

    var cardsRef = new Firebase("https://explaain-v2-1.firebaseio.com/cards");
    var keywordsRef = new Firebase("https://explaain-v2-1.firebaseio.com/keywords");

    // var algoliasearch = require('algoliasearch');
    var client = algoliasearch('RR6V7DE8C8', 'b96680f1343093d8822d98eb58ef0d6b');
    var index = client.initIndex('cards');

    // create a synchronized array
    $scope.cards = $firebaseArray(cardsRef);
    $scope.keywords = $firebaseArray(keywordsRef);
    $scope.cardStack = [];
    $scope.frontCard;
    $scope.editMode = false;

    $scope.cardProp = function(card, property) { //$eval not working
        var string = "card.assets." + property + "[card.variations[0]." + property + "].value";
        var value = $scope.$eval(string);
        return value;
    };

    $scope.showingFilter = function(card) {
        return card.showing;
    };

    $scope.open = function(key) {
        if ($scope.cards.$getRecord(key) !== null) {
            $scope.cards.$getRecord(key).showing = true;
            for (var i = 0; i < $scope.cards.length; i++) {
                $scope.cards[i].atFront = false;
            }
            $scope.cards.$getRecord(key).atFront = true;
        }
    };

    $scope.close = function(card) {
        card.showing = false;
        card.atFront = false;
    };

    $scope.setUpCardStack = function() {
        // $scope.cardStack = 
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
        if (card.editing === undefined) {
            card.editing = true;
        }
        else {
            card.editing = !card.editing;
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
        card.bio.structure = $scope.structureBio(-1, card.bio.value, $scope.keywords);
        card.showing = true;
        card.atFront = false;
        // card.editing = editing;
        card.id = card.title.replace(" ", "-").toLowerCase();

        $scope.cards.$add(card).then(function(ref) {
            var key = ref.key();
            $scope.cards.$indexFor(key); // returns location in the array
            if (card.title.length > 0) {
                $scope.showSimpleToast("Success! You've added a new card called " + card.title);
            }
            else {
                $scope.showSimpleToast("Success! You've added a new card.");
            }
            if (open) {
                $scope.open(key);
            }
            $scope.cards.$getRecord(key).editing = justCreated;
            var newkeyword = {
                keyword: card.title,
                ref: key
            };
            $scope.addNewKeyword(newkeyword, false);
            if (autoPopulate == 'wikipedia') {
                //Nothing here yet
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
                    $scope.card = card;
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
        var tempKeywordsRef = new Firebase("https://explaain-v2-1.firebaseio.com/keywords");
        // tempKeywordsRef.orderByChild("keywordLength").on("child_added", function(snapshot) {
        //     console.log(snapshot.val());
        // });
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
        var tempKeywordsRef = new Firebase("https://explaain-v2-1.firebaseio.com/keywords");
        tempKeywordsRef.orderByChild("ref").equalTo(key).on("child_added", function(snapshot) {
            $scope.deleteKeyword(snapshot.key());
        });
    };

    $scope.updateBios = function(keyword) {
        for (var i = 0; i < $scope.cards.length; i++) {
            var bio = $scope.cards[i].bio.value;
            if (bio.indexOf(keyword.keyword) != -1) {
                $scope.cards[i].bio.structure = $scope.structureBio($scope.cards.$keyAt(i), bio, $scope.keywords);
                $scope.cards.$save(i).then(function(ref) {});
            }
        }
    };

    $scope.updateAllBios = function() {
        var successCount = 0;
        for (var i = 0; i < $scope.cards.length; i++) {
            $scope.cards[i].editing = false;
            $scope.cards[i].justCreated = false;
            $scope.cards[i].showing = Math.round(Math.random() * 10 / 19);
            var bio = $scope.cards[i].bio.value;
            $scope.cards[i].bio.structure = $scope.structureBio($scope.cards.$keyAt(i), bio, $scope.keywords);
            $scope.cards[i].assets = {};
            $scope.cards[i].variations = {};
            $scope.cards.$save(i).then(function(ref) {
                successCount++;
                if (successCount == $scope.cards.length) {
                    $scope.showSimpleToast("Success! You've updated all cards.");
                }
            });
        }
    };

    $scope.updateAllKeywords = function() {
        for (var i = 0; i < $scope.keywords.length; i++) {
            // $scope.keywords[i].keywordLength = $scope.keywords[i].length;
            $scope.keywords.$save(i);
            if ($scope.cards.$getRecord($scope.keywords[i].ref) === null) {
                $scope.keywords.$remove(i);
            }
        }
    };

    $scope.updateEverything = function() {
        $scope.updateAllBios();
        $scope.updateAllKeywords();
        $scope.reImportToAngolia();
    };

    $scope.updateCard = function(key, card) {
        var index = $scope.cards.$indexFor(key);
        $scope.cards[index] = card;
        card.bio.structure = $scope.structureBio(-1, card.bio.value, $scope.keywords);
        $scope.cards.$save(card).then(function(ref) {
            card.editing = false;
            $scope.showSimpleToast("Success! You've updated the card " + card.title);
        });
    };

    $scope.deleteCard = function(key, card) {
        var index = $scope.cards.$indexFor(key);
        $scope.cards[index] = card;
        $scope.cards.$remove(card).then(function(ref) {
            $scope.deleteCardKeywords(key);
            $scope.showSimpleToast("Success! You've deleted the card " + card.title);
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

    $scope.editingCard = function(card) {
        if (card.justCreated === true) {
            card.justCreated = false;
            return true;
        }
        else {
            return false;
        }
    };





    $scope.importToAlgolia = function() {
        // Get all data from Firebase
        cardsRef.on('value', initIndex);

        function initIndex(dataSnapshot) {
            // Array of data to index
            var objectsToIndex = [];

            // Get all objects
            var values = dataSnapshot.val();

            // Process each Firebase ojbect
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

                console.log('Firebase<>Algolia import done');
            });
        }
    }

    $scope.reImportToAngolia = function() {
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





    //Angolia Search

    $scope.hits = [];
    $scope.query = '';
    $scope.initRun = true;
    $scope.search = function() {
        index.search($scope.query, {
                hitsPerPage: 10
            },
            function(err, content) {
                if (err || $scope.query != content.query) {
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
