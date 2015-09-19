function clog(myText) {
    console.log(myText);
};

function clogyo() {
    console.log('yo');
};

var editMode = false;


var firstCard = true;

var ctrlKeyDown = false;
var cardToOpen = ''; //This is not a good way of doing it

var godMode = false;

var myScope;
var mainScope;

var app = angular.module('app', ['firebase', 'ngMaterial', 'algoliasearch', 'ngRoute', 'ngSanitize']); /* global angular */

var oldApp = angular.module('app');


oldApp.controller('mainCtrl', ['$scope', '$timeout', '$http', '$mdToast', '$mdSidenav', 'algolia', '$q', 'Cards', function($scope, $timeout, $firebaseObject, $http, $mdToast, $mdSidenav, algolia, $q, Cards) {

    mainScope = $scope;
    
    $scope.firebaseRef = new Firebase(firebaseRoot); /* global Firebase */ /* global firebaseRoot */
    $scope.clientAlgolia = algoliasearch('RR6V7DE8C8', 'b96680f1343093d8822d98eb58ef0d6b'); /* global algoliasearch */

    Cards.checkServiceWorks();
    Cards.connectToFirebase();
    Cards.connectToAlgolia();
    
    
    
    //Should these be in a service?

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

}]);



app.controller('ExplaainCtrl', ['$scope', '$timeout', '$firebaseObject', '$http', '$mdToast', '$mdSidenav', 'algolia', '$q', 'Cards', function($scope, $timeout, $firebaseObject, $http, $mdToast, $mdSidenav, algolia, $q, Cards) {

    myScope = $scope;

    var clientAlgolia = algoliasearch('RR6V7DE8C8', 'b96680f1343093d8822d98eb58ef0d6b');
    var indexAlgolia = clientAlgolia.initIndex(thisAlgoliaIndex);
    //Check algoliaIndex has been changed to thisAlgoliaIndex in branch-specific.js

    $scope.localUsers = [];
    $scope.localCards = [];
    $scope.localIdentities = [];
    //Remember the positions of objects in the $scope.cards array don't match up to the positions of objects in the $scope.localCards array
    $scope.localUserRefs = {};
    $scope.localCardRefs = {};
    $scope.localIdentityRefs = {};

    $scope.firebaseRef = new Firebase(firebaseRoot);
    $scope.firebaseUsersRef = $scope.firebaseRef.child("users");
    $scope.firebaseCardsRef = $scope.firebaseRef.child("cards");
    $scope.firebaseIdentitiesRef = $scope.firebaseRef.child("identities");
    $scope.firebaseKeywordsRef = $scope.firebaseRef.child("keywords");


    Cards.checkServiceWorks();

    $scope.firebaseKeywordsRef.on("child_removed", function(snapshot) {
        var tempKeywordTitle = snapshot.val().keyword;
        $scope.updateBiosFromKeyword(tempKeywordTitle);
        $scope.showSimpleToast("Success! You've deleted the keyword \"" + tempKeywordTitle + "\"");
    });

    // $scope.firebaseIdentitiesRef.on("child_added", function(snapshot) {
    //     var identityKey = snapshot.key();
    //     var firstCardKey = snapshot.val().cards[0].key;
    //     var firstCard = $scope.firebaseCardsRef.child(firstCardKey);
    //     var firstCardTitle = firstCard.val().title;
    //     firstCard.set({
    //         identity: identityKey
    //     }, function(error) {
    //         $scope.reImportCard(firstCardKey);
    //         var newkeyword = {
    //             keyword: firstCardTitle,
    //             identityRef: identityKey
    //         };
    //         $scope.addNewKeyword(newkeyword, false);
    //     });
    // });

    $scope.importWatch = false;
    $scope.importCardWatch = false;
    $scope.importCardWatch1 = false;
    $scope.cardOpened = false;
    $scope.identityKeyTemp;
    $scope.initialCardKeyTemp;

    $scope.loggedIn = false;
    $scope.loginData = {};

    $scope.frontCard;
    $scope.editMode = false;


    $scope.formatOptions = [
        'profile',
        'quote'
    ];




    $scope.showingFilter = function(card) {
        var localCardRef = $scope.localCardRefs[card.objectID];
        return localCardRef.showing;
    };

    $scope.importUser = function(key) {
        var tempUsersRef = new Firebase(firebaseRoot + "/users/" + key);
        var newUser = $firebaseObject(tempUsersRef);


        // newUser.$loaded().then(function(data) {
        //     $scope.importCardWatch = true;
        // });

        $scope.localUsers.push(newUser);
        $scope.localUserRefs[key] = {};
        $scope.localUserRefs[key].ref = $scope.localUsers.length - 1;
        return $scope.localUserRefs[key];
    };



    $scope.getIdentity = function(key) { //Returns local identity with a promise, regardless of whether an import is needed
        return $q(function(resolve, reject) {
            var localIdentityRef = $scope.localIdentityRefs[key];
            if (localIdentityRef) {
                resolve(localIdentityRef);
            }
            else {
                var promise = $scope.importIdentity(key);
                promise.then(function(localIdentityRef2) {
                    localIdentityRef = localIdentityRef2;
                    resolve(localIdentityRef);
                });
            }
        });
    };

    $scope.getCard = function(key) { //Returns local card with a promise, regardless of whether an import is needed
        return $q(function(resolve, reject) {
            var localCardRef = $scope.localCardRefs[key];
            if (localCardRef) {
                resolve(localCardRef);
            }
            else {
                var promise = $scope.importCard(key);
                promise.then(function(localCardRef2) {
                    localCardRef = localCardRef2;
                    resolve(localCardRef);
                });
            }
        });
    };

    $scope.importIdentity = function(key) {
        return $q(function(resolve, reject) {
            $scope.firebaseIdentitiesRef.child(key).once('value', function(snapshot) {
                $scope.localIdentities.push(snapshot.val());
                $scope.localIdentityRefs[key] = {};
                $scope.localIdentityRefs[key].ref = $scope.localIdentities.length - 1; //Will this deal well with multiple asynchronous requests? Probs not.
                $scope.localIdentityRefs[key].keywords = $scope.getIdentityKeywords(key);
                console.log(snapshot.val());
                resolve($scope.localIdentityRefs[key]);
            });
        });

        // var tempIndentitiesRef = new Firebase(firebaseRoot + "/identities/" + key);
        // var newIdentity = $firebaseObject(tempIndentitiesRef);
        // $scope.localIdentities.push(newIdentity);

        // $scope.localIdentityRefs[key] = {};
        // $scope.localIdentityRefs[key].ref = $scope.localIdentities.length - 1;
        // // $scope.localIdentityRefs[key].keywords = $scope.getCardKeywords(key); //Need to add this in



        // newIdentity.$loaded().then(function(data) {
        //     // $scope.importCard(newIdentity.cards[0].key);
        //     $scope.importWatch = true;
        // });


        // return $scope.localIdentityRefs[key];
    };

    $scope.importCard = function(key) {
        return $q(function(resolve, reject) {
            $scope.firebaseCardsRef.child(key).once('value', function(snapshot) {
                var tempCard = snapshot.val();
                tempCard.objectID = snapshot.key();
                // console.log(tempCard);
                $scope.localCards.push(tempCard);
                $scope.localCardRefs[key] = {};
                $scope.localCardRefs[key].identity = tempCard.identity;
                $scope.localCardRefs[key].ref = $scope.localIdentities.length - 1; //Will this deal well with multiple asynchronous requests? Probs not.
                // $scope.localCardRefs[key].keywords = $scope.getCardKeywords(key); //Need to add this in

                var localUserRef = $scope.localUserRefs[tempCard.authorId];
                if (localUserRef === undefined) {
                    $scope.importUser(tempCard.authorId);
                }

                if (firstCard) {
                    firstCard = false;
                    var element = document.getElementById("spinner");
                    element.parentNode.removeChild(element);
                }

                console.log(snapshot.val());

                resolve($scope.localCardRefs[key]);
            });
        });



        var tempCardsRef = new Firebase(firebaseRoot + "/cards/" + key);
        var newCard = $firebaseObject(tempCardsRef);

        newCard.$loaded().then(function(data) {

            $scope.importCardWatch = true;
            $scope.importCardWatch1 = true;



            if ($scope.firstCard) {
                $scope.firstCard = false;
                var element = document.getElementById("spinner");
                element.parentNode.removeChild(element);
            }

            var localUserRef = $scope.localUserRefs[data.authorId];
            if (localUserRef === undefined) {
                $scope.importUser(data.authorId);
            }


        });

        $scope.localCards.push(newCard);
        $scope.localCardRefs[key] = {};
        $scope.localCardRefs[key].ref = $scope.localCards.length - 1;
        console.log('about to get card keywords...');
        // $scope.localCardRefs[key].keywords = $scope.getCardKeywords(key);
        return $scope.localCardRefs[key];
    };

    $scope.reImportCard = function(key) {
        $scope.firebaseCardsRef.child(key).once('value', function(snapshot) {
            // var tempCard = snapshot.val();
            $scope.localCards[$scope.localCardRefs[key]] = snapshot.val(); //The trouble with this is it doesn't update the stuff in localCardRefs!
        });

        // var tempCardsRef = new Firebase(firebaseRoot + "/cards/" + key);
        // var card = $scope.localCards[$scope.localCardRefs[key]];
        // // $scope.localCardRefs[key].keywords = $scope.getCardKeywords(key);
        // card = $firebaseObject(tempCardsRef);
    };

    $scope.identityImported = function(key) {
        if ($scope.localIdentityRefs[key] !== undefined) {
            return true;
        }
        else {
            return false;
        }
    };

    $scope.cardImported = function(key) {
        if ($scope.localCardRefs[key] !== undefined) {
            return true;
        }
        else {
            return false;
        }
    };

    $scope.getIdentityKeywords = function(key) {
        var identityKeywords = [];
        $scope.firebaseKeywordsRef.orderByChild("identityRef").equalTo(key).on("child_added", function(snapshot) {
            var keyword = snapshot.val();
            keyword.objectID = snapshot.key();
            identityKeywords.push(keyword);
        });
        return identityKeywords;
    };

    $scope.getLinksfromText = function(structure) {
        var textLinks = [];
        for (i = 0; i < structure.length; i++) {
            if (structure[i].type == 'link' & textLinks.indexOf(structure[i].ref) == -1) {
                textLinks.push(structure[i].ref);
            }
        }
        return textLinks;
    };



    $scope.openFromCardKey = function(cardKey) { //For now just selects identity from card and then acts as normal (so will select the most popular card from that identity)
        if (cardKey === undefined) {
            cardKey = cardToOpen;
            if (cardKey === undefined || cardKey == "") {
                console.log("giving up (card)");
                return;
            }
        }

        $scope.getCard(cardKey).then(function(localCardRef) {
            var card = $scope.localCards[localCardRef.ref];
            var identityKey = card.identity;
            $scope.open(identityKey);
        });
    };

    $scope.open = function(identityKey) {
        var cardKey;

        if (identityKey === undefined) { //This shouldn't be needed - nee dto sort out local/global directive variables etc
            identityKey = cardToOpen;
        }

        if (identityKey === undefined || identityKey == "") {
            console.log("giving up");
            return;
        }

        $scope.getIdentity(identityKey).then(function(localIdentityRef2) {
            cardKey = $scope.localIdentities[$scope.localIdentityRefs[identityKey].ref].cards[0].key;

            $scope.getCard(cardKey).then(function(localCardRef) {
                for (var i = 0; i < $scope.localCards.length; i++) {
                    $scope.localCards[i].atFront = false;
                }

                localCardRef.showing = true;
                localCardRef.atFront = true;
                localCardRef.editing = false;

                //The stuff below is for importing the next set of cards before you click on any of them - needs testing and making sure it happens AFTER this card has loaded properly, so user doesn't notice
                // var linkedCardsToImport = $scope.getLinksfromText($scope.localCards[localCardRef.ref].bio.structure);
                // for (i = 0; i < linkedCardsToImport.length; i++) {
                //     $scope.getIdentity(linkedCardsToImport[i]).then(function(localIdentityRef3) {
                //         cardKey2 = $scope.localIdentities[localIdentityRef3.ref].cards[0].key;
                //         $scope.getCard(cardKey2).then(function(localCardRef2) {
                //         });
                //     });
                // }
            });
        });
    };

    $scope.close = function(card) {
        var localCardRef = $scope.localCardRefs[card.objectID];
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
        var localCardRef = $scope.localCardRefs[card.objectID];

        if (localCardRef.editing === undefined) {
            localCardRef.editing = true;
        }
        else {
            localCardRef.editing = !localCardRef.editing;
        }
    };

    $scope.addNewIdentity = function(initialCardKey, initialKeyword, open) { //Only call this function once the card has been created
        var newIdentity = {
            cards: [{
                key: initialCardKey,
                rank: 0
            }]
        };

        // var initialKeyword = $scope.localCards[$scope.localCardRefs[initialCardKey].ref].title; //Not ideal as relies on having the card local

        var tempIdentity = $scope.firebaseIdentitiesRef.push();
        var identityKey = tempIdentity.key();
        tempIdentity.set(newIdentity, function(error) {
            var initialCard = $scope.firebaseCardsRef.child(initialCardKey);
            var initialCardTitle = initialKeyword; //$scope.firebaseCardsRef.child(initialCardKey).val().title;
            initialCard.update({
                identity: identityKey
            }, function(error) {
                $scope.reImportCard(initialCardKey);
                var newkeyword = {
                    keyword: initialCardTitle,
                    identityRef: identityKey
                };
                $scope.addNewKeyword(newkeyword, false);

                if (open) {
                    $scope.open(identityKey);
                }
            });
        });

        //    $scope.firebaseIdentitiesRef.on("child_added", function(snapshot) {
        //     var identityKey = snapshot.key();
        //     var firstCardKey = snapshot.val().cards[0].key;
        //     var firstCard = $scope.firebaseCardsRef.child(firstCardKey);
        //     var firstCardTitle = firstCard.val().title;
        //     firstCard.set({
        //         identity: identityKey
        //     }, function(error) {
        //         $scope.reImportCard(firstCardKey);
        //         var newkeyword = {
        //             keyword: firstCardTitle,
        //             identityRef: identityKey
        //         };
        //         $scope.addNewKeyword(newkeyword, false);
        //     });
        // });

        // $scope.globalIdentities.$add(newIdentity).then(function(ref) {
        //     var identityKey = ref.key();
        //     $scope.identityKeyTemp = identityKey;
        //     $scope.initialCardKeyTemp = initialCardKey;

        //     // $scope.globalCards.$getRecord(initialCardKey).identity = identityKey;
        //     // $scope.globalCards.$getRecord(initialCardKey).$save().then(function(ref) {
        //     //     
        //     //     
        //     // });

        //     if (open) {
        //         $scope.open(identityKey);
        //     }

        //     $scope.$watch('cardOpened', function(newValue, oldValue) {
        //         if ($scope.cardOpened) {
        //             $scope.cardOpened = false;
        //             console.log($scope.localCardRefs);
        //             $scope.localCards[$scope.localCardRefs[$scope.initialCardKeyTemp].ref].indentity = $scope.identityKeyTemp;

        //             console.log('Should now have card and identity both linked:');
        //             // console.log($scope.localIdentities[$scope.localIdentityRefs[identityKey].ref]);
        //             console.log($scope.localCards[$scope.localCardRefs[initialCardKey].ref]);

        //             console.log(tempCardssRef);
        //             var tempCardssRef = new Firebase(firebaseRoot + "/cards/" + $scope.initialCardKeyTemp);
        //             tempCardssRef.update({
        //                 identity: $scope.identityKeyTemp
        //             });
        //             console.log(tempCardssRef);

        //             // var newIdentity = $firebaseObject(tempIndentitiesRef);

        //             // $scope.globalCards.$save(card).then(function(ref) {
        //             //     var key = ref.key();
        //             //     console.log(key);
        //             //     console.log($scope.globalCards);
        //             // });
        //         }
        //     });


        //     var newkeyword = {
        //         keyword: initialKeyword,
        //         identityRef: identityKey
        //     };
        //     $scope.addNewKeyword(newkeyword, false);


        // });
    };

    $scope.addNewCard = function(card, open, justCreated, autoPopulate) {
        //This needs to be passed into the function, not created here
        var cardIdentityKey = undefined;

        card.dateCreated = Date.now();
        card.authorId = $scope.loginData.uid;
        card.sources = [];

        card.format = prompt("What format should the new card take?", "profile");

        if (card.format === undefined) {
            card.format = 'profile';
        }
        if (card.title === undefined) {
            card.title = '';
        }
        if (card.bio === undefined) {
            card.bio = {
                value: '',
                structure: []
            };
        }
        card.bio.structure = [];
        card.bio.structure = $scope.structureBio(-1, card.bio.value, $scope.orderedKeywords);

        card.id = card.title.replace(" ", "-").toLowerCase();

        var newCardRef = $scope.firebaseCardsRef.push();
        newCardRef.set(card, function(error) {
            var key = newCardRef.key();
            if (card.title.length > 0) {
                $scope.showSimpleToast("Success! You've added a new card called " + card.title);
            }
            else {
                $scope.showSimpleToast("Success! You've added a new card.");
            }

            if (cardIdentityKey === undefined) { //$scope.addNewIdentity will sort the opening
                $scope.addNewIdentity(key, card.title, open);
            }
            else {
                if (open) {
                    $scope.open(cardIdentityKey);
                }
            }

            $scope.algoliaAdd(card, key);
        });
    };

    $scope.populateFromWikipedia = function(card, inScope) {
        var title = card.title;
        $http.jsonp('https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&lllimit=500&titles=' + title + '&callback=JSON_CALLBACK&formatversion=2').
        success(function(data) {
            // card.sources.push({title: 'Wikipedia', url: 'https://en.wikipedia.org/'}); //Needs if statement in case Wikipedia already listed
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
                                    ref: keywords[j].identityRef
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
            identityRef: card.objectID
        };
        $scope.addNewKeyword(newkeyword, true);
        $scope.localCardRefs[card.objectID].keywords[$scope.localCardRefs[card.objectID].keywords.length - 1].pop(); //This shouldn't be necessary, it's because two new ones are created. Not even sure which one gets deleted!
        return newkeyword;
    }

    $scope.addNewKeyword = function(newkeyword, showToast) {
        if (newkeyword.keyword.length < 1) {
            return;
        }
        newkeyword.keywordLength = newkeyword.keyword.length * -1;
        var newKeywordRef = $scope.firebaseKeywordsRef.push();
        newKeywordRef.setWithPriority(newkeyword, newkeyword.keywordLength, function(error) { //Need to retrospectively set priorities for existing keywords (one time only)
            $scope.updateBiosFromKeyword(newkeyword.keyword);
            if (showToast) {
                $scope.showSimpleToast("Success! You've added the keyword \"" + newkeyword.keyword + "\"");
            }
        });

        // $scope.keywords.$add(newkeyword).then(function(ref) {
        //     $scope.updateBiosFromKeyword(newkeyword);
        //     if (showToast) {
        //         $scope.showSimpleToast("Success! You've added the keyword \"" + newkeyword.keyword + "\"");
        //     }
        // });
    };

    $scope.deleteKeyword = function(key) {
        var keywordToDelete = $scope.firebaseKeywordsRef.child(key);
        keywordToDelete.remove();

        // var keywordToDelete = $scope.keywords.$getRecord(key);
        // var tempKeyword = keywordToDelete;
        // $scope.keywords.$remove(keywordToDelete).then(function(ref) {
        //     $scope.updateBiosFromKeyword(tempKeyword);
        //     $scope.showSimpleToast("Success! You've deleted the keyword \"" + tempKeyword.keyword + "\"");
        // });
    };

    $scope.deleteIdentityKeywords = function(key) {
        // var tempKeywordsRef = new Firebase(firebaseRoot + "/keywords");
        $scope.firebaseKeywordsRef.orderByChild("identityRef").equalTo(key).on("child_added", function(snapshot) {
            $scope.deleteKeyword(snapshot.key());
        });
    };

    $scope.reorderKeywords = function(callback) { //Should render this unecessary by using Firebase's ordered lists with keywordLength as the ordering key
        $scope.orderedKeywords = [];
        tempScopeKeywordsRef.orderByChild("keywordLength").on("child_added", function(snapshot) {
            $scope.orderedKeywords.push(snapshot.val());
            if (callback && typeof(callback) === "function") {
                callback();
            }
        });
    };

    $scope.updateBiosFromKeyword = function(keywordText) {
        //Should this use Algolia to search through bios?
        //Slightly updated now we have localCards, but still not quite right
        $scope.reorderKeywords(); //Need a callback here to finish this before proceeding - though hopefully soon not needed as keywords will already have been reordered using setPriority or setWithPriority

        $scope.firebaseCardsRef.on('child_added', function(snapshot) { //Should this be once() not on() to stop it continuing to do it?
            var key = snapshot.key();
            var bio = snapshot.val().bio.value;
            if (bio.indexOf(keywordText) != -1) {
                var tempStructuredBio = $scope.structureBio(key, bio, $scope.orderedKeywords);
                $scope.firebaseCardsRef.child(key).child('bio').child('structure').set(tempStructuredBio);
                if ($scope.cardImported(key)) {
                    $scope.reImportCard(key);
                }
            }
        });

        // for (var i = 0; i < $scope.globalCards.length; i++) {
        //     var bio = $scope.globalCards[i].bio.value;
        //     if (bio.indexOf(keywordText) != -1) {
        //         $scope.globalCards[i].bio.structure = $scope.structureBio($scope.globalCards.$keyAt(i), bio, $scope.orderedKeywords);
        //         $scope.globalCards.$save(i).then(function(ref) {
        //             var key = ref.key();
        //             if ($scope.cardImported(key)) {
        //                 $scope.reImportCard(key);
        //             }
        //         });
        //     }
        // }
    };

    $scope.updateAllIdentities = function() {
        var tempIdentityListOfCardKeys = [];
        $scope.firebaseIdentitiesRef.on('child_added', function(snapshot) { //Should this be once() not on() to stop it continuing to do it?
            $scope.firebaseCardsRef.child(snapshot.val().cards[0].key).on('value', function(cardSnapshot) { //Should this be once() not on() to stop it continuing to do it?
                if (tempIdentityListOfCardKeys.indexOf(cardSnapshot.key()) == -1) {
                    tempIdentityListOfCardKeys.push(cardSnapshot.key());
                }
                else {
                    // $scope.firebaseIdentitiesRef.child(snapshot.key()).remove();
                }
                if (!cardSnapshot.val().title) {
                    console.log('need to remove this identity: ', snapshot.val());
                    // $scope.firebaseIdentitiesRef.child(snapshot.key()).remove();
                    console.log('need to remove this card: ', cardSnapshot.val());
                    // $scope.firebaseCardsRef.child(cardSnapshot.key()).remove();

                    $scope.firebaseKeywordsRef.orderByChild("identityRef").equalTo(snapshot.key()).on("child_added", function(keywordSnapshot) {
                        console.log('need to remove this keyword: ', keywordSnapshot.val());
                        // $scope.firebaseIdentitiesRef.child(keywordSnapshot.key()).remove();
                    });
                }
            });
            // $scope.firebaseCardsRef.child(snapshot.val().cards[0].key).update({
            //     identity: snapshot.key()
            // });
        });
    }

    $scope.updateAllCards = function() {
        $scope.reorderKeywords(); //Need a callback here to finish this before proceeding

        $scope.firebaseCardsRef.on('child_added', function(snapshot) { //Should this be once() not on() to stop it continuing to do it?
            var key = snapshot.key();
            if (!snapshot.val().title) {
                console.log('need to remove this card2: ', snapshot.val());
                // $scope.firebaseCardsRef.child(key).remove();
            }
            else {
                var bio = snapshot.val().bio.value;
                var tempStructuredBio = $scope.structureBio(key, bio, $scope.orderedKeywords);
                $scope.firebaseCardsRef.child(key).child('bio').child('structure').set(tempStructuredBio);
                if ($scope.cardImported(key)) {
                    $scope.reImportCard(key);
                }
            }
        });

        //Need multiple callbacks for this
        // $scope.showSimpleToast("Success! You've updated all cards.");






        // var successCount = 0;

        //temp
        // for (var i = 0; i < $scope.globalIdentities.length; i++) { //$scope.globalIdentities no longer exists!
        //     
        //     var identityKey = $scope.globalIdentities[i].objectID;
        //     var firstCardKey = $scope.globalIdentities[i].cards[0].key;
        //     $scope.globalCards.$getRecord(firstCardKey).identity = identityKey;
        // }


        // for (var i = 0; i < $scope.globalCards.length; i++) {
        //     if ($scope.globalCards[i].image) {
        //         // $scope.globalCards[i].image.value = $scope.globalCards[i].image.value.replace("//", "http://");
        //         // $scope.globalCards[i].image.value = $scope.globalCards[i].image.value.replace("https:http://", "https://");
        //     }
        //     $scope.globalCards[i].editing = false; //Shouldn't be necessary as this variable should only exist locally
        //     $scope.globalCards[i].justCreated = false; //Shouldn't be necessary as this variable should only exist locally
        //     var bio = $scope.globalCards[i].bio.value;
        //     $scope.globalCards[i].bio.structure = $scope.structureBio($scope.globalCards.$keyAt(i), bio, $scope.orderedKeywords);

        //     //Can delete this now???
        //     // if (!$scope.globalCards[i].identity) {
        //     //     $scope.addNewIdentity($scope.globalCards[i].objectID);
        //     // }

        //     $scope.globalCards.$save(i).then(function(ref) {
        //         var key = ref.key();
        //         successCount++;
        //         if ($scope.cardImported(key)) {
        //             $scope.reImportCard(key);
        //         }
        //         if (successCount == $scope.globalCards.length) {
        //             $scope.showSimpleToast("Success! You've updated all cards.");
        //         }
        //     });
        // }
    };

    $scope.updateAllKeywords = function() {
        $scope.firebaseKeywordsRef.on('child_added', function(snapshot) {
            var tempKeywordLength = snapshot.val().keywordLength;
            // console.log('tempKeywordLength', tempKeywordLength);
            snapshot.ref().setPriority(tempKeywordLength);
            // console.log(snapshot.val().identityRef);
            $scope.firebaseIdentitiesRef.child(snapshot.val().identityRef).once('value', function(identitySnapshot) {
                // console.log(snapshot.val().identityRef);
                // console.log(identitySnapshot.val());
            }, function(error) {
                $scope.firebaseKeywordsRef.child(snapshot.key()).remove(function() { //Don't yet know whether this actually works!
                    // console.log("Keyword " + snapshot.val().keyword + " removed.");
                });
            });
        });

        // for (var i = 0; i < $scope.keywords.length; i++) {
        //     $scope.keywords[i].identityRef = $scope.globalCards.$getRecord($scope.keywords[i].ref).identity;
        //     $scope.keywords[i].keywordLength = $scope.keywords[i].keyword.length * -1; //Maybe now not needed if this happens when new keyword created?

        //     $scope.keywords.$save(i);
        //     if ($scope.globalCards.$getRecord($scope.keywords[i].ref) === null) {
        //         $scope.keywords.$remove(i);
        //     }
        // }
    };

    $scope.updateEverything = function() {
        //All of this needs callbacks
        $scope.updateAllKeywords();
        $scope.updateAllCards();
        $scope.updateAllIdentities();
        // $scope.reorderKeywords($scope.updateAllCards);
        if (ctrlKeyDown) {
            $scope.reImportToAlgolia();
        }
    };

    $scope.updateCard = function(key, card) {
        card.bio.structure = $scope.structureBio(-1, card.bio.value, $scope.orderedKeywords);
        $scope.firebaseCardsRef.child(key).update(card, function(error) {
            localCardRef.editing = false;
            $scope.algoliaUpdate(key, card);
            $scope.reImportCard(key);
            $scope.showSimpleToast("Success! You've updated the card " + card.title); //Shouldn't really display this until algoliaUpdate and reImportCard are complete
        });

        // var localCardRef = $scope.localCardRefs[key];
        // var index = $scope.globalCards.$indexFor(key);
        // $scope.globalCards[index] = card;
        // card.bio.structure = $scope.structureBio(-1, card.bio.value, $scope.orderedKeywords);
        // // card.image.value = card.image.value.replace("http://", "//");
        // // card.image.value = card.image.value.replace("https://", "//");
        // $scope.globalCards.$save(card).then(function(ref) {
        //     localCardRef.editing = false;
        //     $scope.algoliaUpdate(key, card);
        //     $scope.showSimpleToast("Success! You've updated the card " + card.title);
        // });
    };

    $scope.deleteCard = function(key, card) {
        var title = card.title;
        var identityKey = card.identity;

        $scope.firebaseCardsRef.child(key).remove(function() {
            $scope.localCards.splice($scope.localCardRefs[key].ref, 1);
            $scope.localCardRefs[key] = null;
            $scope.deleteIdentity(identityKey, title); //Needs to only be if the identity has no more cards left
            $scope.algoliaDelete(key);

            //The following should really only happen after various callbacks
            $scope.showSimpleToast("Success! You've deleted the card " + title);
        });



        // var index = $scope.globalCards.$indexFor(key);

        // $scope.globalCards[index] = card;

        // $scope.localCards.splice($scope.localCardRefs[key].ref, 1);

        // $scope.globalCards.$remove(card).then(function(ref) {
        //     $scope.deleteIdentity(identityKey, title); //Needs to only be if the identity has no more cards left

        //     // $scope.deleteCardKeywords(key);

        //     $scope.algoliaDelete(key);

        //     $scope.showSimpleToast("Success! You've deleted the card " + title);
        // });
    };

    $scope.deleteIdentity = function(identityKey, title) {

        $scope.firebaseIdentitiesRef.child(identityKey).remove(function() {
            $scope.localIdentities.splice($scope.localIdentityRefs[identityKey].ref, 1);
            $scope.localIdentityRefs[identityKey] = null;
            // $scope.algoliaDelete(key); //Need to add Identities to Algolia and work out what we can do with them
            $scope.deleteIdentityKeywords(identityKey);
            $scope.showSimpleToast("Success! You've deleted the identity " + title);
        });

        // var index = $scope.globalIdentities.$indexFor(identityKey);

        // var identityToRemove = new Firebase(firebaseRoot + "/identities/" + identityKey);

        // console.log(identityKey);
        // console.log($scope.localIdentityRefs);
        // $scope.localIdentities.splice($scope.localIdentityRefs[identityKey].ref, 1);

        // identityToRemove.remove($scope.afterDeleteIdentity(identityKey, title));
    };

    $scope.afterDeleteIdentity = function(identityKey, title) {
        console.log(identityKey);
        $scope.deleteIdentityKeywords(identityKey);

        // $scope.algoliaDelete(key); //Need to add Identities to Algolia and work out what we can do with them

        $scope.showSimpleToast("Success! You've deleted the card " + title);
    };

    $scope.toastPosition = {
        bottom: false,
        top: true,
        left: false,
        right: true
    };



    $scope.toggleLogin = function() {
        if ($scope.loggedIn) {
            $scope.firebaseRef.unAuth();
        }
        else {
            $scope.logMeIn('twitter');
        }
    }

    $scope.logMeIn = function(loginProvider) {
        switch (loginProvider) {
            case 'twitter':
                {
                    $scope.firebaseRef.authWithOAuthPopup("twitter", function(error, authData) {
                        if (error) {
                            console.log('twitter error');
                        }
                        else {
                            console.log('twitter success!');
                            $scope.loggedIn = true;
                            $scope.loginData = authData;
                            $scope.$apply();
                            $scope.showSimpleToast("Hello " + authData.twitter.displayName + "! You're now logged in.");

                            $scope.firebaseUsersRef.once('value', function(snapshot) {
                                // if (!snapshot.hasChild(authData.uid)) {
                                $scope.firebaseRef.child("users").child(authData.uid).update({
                                    uid: authData.uid,
                                    provider: authData.provider,
                                    name: authData.twitter.displayName,
                                    username: authData.twitter.username,
                                    image: authData.twitter.profileImageURL,
                                    url: "http://twitter.com/" + authData.twitter.username
                                });
                                // }
                            });
                        }
                    });
                }
        }
    };

    $scope.allowEditMode = function() {
        if ($scope.loggedIn | godMode) {
            return true;
        }
        else {
            return false;
        }
    };

    $scope.cardBelongsToUser = function(card) {
        if (card.authorId == $scope.loginData.uid | godMode) {
            return true;
        }
        else {
            return false;
        }
    };

    $scope.cardCanBeClaimed = function(card) {
        if ($scope.loggedIn & card.authorId == undefined & !godMode) {
            return true;
        }
        else {
            return false;
        }
    };

    $scope.claimCard = function(key) {
        if ($scope.loggedIn) {
            $scope.firebaseCardsRef.child(key).update({
                authorId: $scope.loginData.uid
            }, function(error) {
                $scope.reImportCard(key);
            });
        }
    }







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
        $scope.firebaseCardsRef.on('value', reindexIndex);

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


                });
            });
        }
    }



    $scope.algoliaAdd = function(card, key) {
        var myObjectID = key;
        indexAlgolia.addObject(card, myObjectID, function(err, content) {


        });
    };

    $scope.algoliaUpdate = function(key, card) {


        card.objectID = key;
        card.$$conf = null; //Probably not necessary to delete all of this (only to prevent "TypeError: Converting circular structure to JSON" error)
        indexAlgolia.saveObject(card, function(err, content) {

            // 
        });
    };

    $scope.algoliaDelete = function(key) {
        indexAlgolia.deleteObject(key, function(error) {
            if (!error) {

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
    var tempCard1 = $scope.open(initialIdentity, true); //initialCard and initialIdentity are defined in branch-specific.js
    // tempCard1.editing = false;

}]);




app.service('Cards', ['$rootScope', '$q', function($rootScope, $q) {
    var service = {

        loggedIn: false,
        loginData: {},
        editMode: false,

        firebaseCards: null,
        firebaseIdentities: null,
        firebaseKeywords: null,
        firebaseUsers: null,

        cards: [],
        identities: [],
        keywords: [],
        users: [],

        orderedKeywords: [],


        checkServiceWorks: function() {
            console.log('Service works!');
        },

        connectToFirebase: function() { // Needs to be called on page load
            service.firebaseCards = $rootScope.firebaseRef.child("cards");
            service.firebaseIdentities = $rootScope.firebaseRef.child("identities");
            service.firebaseKeywords = $rootScope.firebaseRef.child("keywords");
            service.firebaseUsers = $rootScope.firebaseRef.child("users");
        },

        connectToAlgolia: function() { // Needs to be called on page load
            //Check algoliaIndex has been changed to thisAlgoliaIndex in branch-specific.js
            service.algoliaIndex = $rootScope.clientAlgolia.initIndex(thisAlgoliaIndex); /* global thisAlgoliaIndex */
            
            service.hits = [];
            service.query = '';
            service.initRun = true;
            service.search = function() {
                service.algoliaIndex.search(service.query, {
                        hitsPerPage: 20
                    },
                    function(err, content) {
                        if (err || service.query != content.query) {

                            return;
                        }
                        service.hits = content.hits;
                        if (service.initRun) {
                            service.$apply();
                            service.initRun = false;
                        }
                    });
            };
            service.search();

        },

        removeSpinner: function() {
            if (firstCard) {
                firstCard = false;
                var element = document.getElementById("spinner");
                element.parentNode.removeChild(element);
            }
        },

        cardKeyPos: function(key) {
            var card = service.cardImported(key);
            return service.cards.indexOf(card);
        },

        identityKeyPos: function(key) {
            var identity = service.identityImported(key);
            return service.identities.indexOf(identity);
        },

        keywordKeyPos: function(key) {
            var keyword = service.keywordImported(key);
            return service.keywords.indexOf(keyword);
        },

        userKeyPos: function(key) {
            var user = service.userImported(key);
            return service.users.indexOf(user);
        },

        cardImported: function(key) {
            var card = $.grep(service.cards, function(e) {
                return e.objectID == key;
            })[0];
            return card;
        },

        identityImported: function(key) {
            var identity = $.grep(service.identities, function(e) {
                return e.objectID == key;
            })[0];
            return identity;
        },

        keywordImported: function(key) {
            var keyword = $.grep(service.keywords, function(e) {
                return e.objectID == key;
            })[0];
            return keyword;
        },

        userImported: function(key) {
            var user = $.grep(service.users, function(e) {
                return e.objectID == key;
            })[0];
            return user;
        },

        getCard: function(key) {
            return $q(function(resolve, reject) {
                var card = service.cardImported(key);
                if (card) {
                    resolve(card);
                }
                else {
                    var promise = service.importCard(key);
                    promise.then(function(tempCard) {
                        card = tempCard;
                        resolve(card);
                    });
                }
            });
        },

        getIdentity: function(key) {
            return $q(function(resolve, reject) {
                var identity = service.identityImported(key);
                if (identity) {
                    resolve(identity);
                }
                else {
                    var promise = service.importIdentity(key);
                    promise.then(function(tempIdentity) {
                        identity = tempIdentity;
                        resolve(identity);
                    });
                }
            });

        },

        getKeyword: function(key) { //Not yet used, and may well not be while all text structuring is done on the front end
            return $q(function(resolve, reject) {
                var keyword = service.keywordImported(key);
                if (keyword) {
                    resolve(keyword);
                }
                else {
                    var promise = service.importKeyword(key);
                    promise.then(function(tempKeyword) {
                        keyword = tempKeyword;
                        resolve(keyword);
                    });
                }
            });

        },

        getUser: function(key) {
            return $q(function(resolve, reject) {
                var user = service.userImported(key);
                if (user) {
                    resolve(user);
                }
                else {
                    var promise = service.importUser(key);
                    promise.then(function(tempUser) {
                        user = tempUser;
                        resolve(user);
                    });
                }
            });

        },

        importCard: function(key) {
            return $q(function(resolve, reject) {
                service.firebaseCards.child(key).once('value', function(snapshot) {

                        var newCard = {
                            data: snapshot.val(),
                            objectID: snapshot.key(),
                            editing: false,
                            atFront: false,
                            showing: false,
                        };

                        service.getIdentity(newCard.data.identity).then(function() {
                            service.users.push(service.getUser(newCard.data.authorId)).then(function() {
                                service.removeSpinner();
                                var length = service.cards.push(newCard);
                                resolve(service.cards[length - 1]);
                            });
                        });

                    },
                    function(error) {
                        reject(-1);
                    });
            });
        },

        importIdentity: function(key) {
            return $q(function(resolve, reject) {
                service.firebaseIdentities.child(key).once('value', function(snapshot) {

                    var newIdentity = {
                        data: snapshot.val(),
                        objectID: snapshot.key(),
                        keywords: service.getIdentityKeywords(key)
                    };

                    var length = service.identities.push(newIdentity);
                    resolve(service.identities[length - 1]);

                }, function(error) {
                    reject(-1);
                });
            });
        },

        importKeyword: function(key) { //Not yet used, and may well not be while all text structuring is done on the front end
            return $q(function(resolve, reject) {
                service.firebaseKeywords.child(key).once('value', function(snapshot) {

                    var newKeyword = {
                        data: snapshot.val(),
                        objectID: snapshot.key()
                    };

                    var length = service.keywords.push(newKeyword);
                    resolve(service.keywords[length - 1]);

                }, function(error) {
                    reject(-1);
                });
            });

        },

        importUser: function(key) {
            return $q(function(resolve, reject) {
                service.firebaseUsers.child(key).once('value', function(snapshot) {

                    var newUser = {
                        data: snapshot.val()
                    };

                    var length = service.users.push(newUser);
                    resolve(service.users[length - 1]);

                }, function(error) {
                    reject(-1);
                });
            });
        },

        reImportCard: function(key) {
            return $q(function(resolve, reject) {
                service.firebaseCards.child(key).once('value', function(snapshot) {
                    service.cards[service.cardKeyPos(key)].data = snapshot.val();
                    resolve(service.cards[service.cardKeyPos(key)]);

                }, function(error) {
                    reject(-1);
                });
            });
        },

        addNewCard: function(cardData, open, justCreated, autoPopulate) {
            //This needs to be passed into the function, not created here
            var identityKey = undefined;

            cardData.dateCreated = Date.now();
            cardData.authorId = service.loginData.uid;
            cardData.sources = [];

            cardData.format = prompt("What format should the new card take?", "profile");

            if (cardData.format === undefined) {
                cardData.format = 'profile';
            }
            if (cardData.title === undefined) {
                cardData.title = '';
            }
            if (cardData.bio === undefined) {
                cardData.bio = {
                    value: '',
                    structure: []
                };
            }
            cardData.bio.structure = [];
            cardData.bio.structure = service.structureText(-1, cardData.bio.value, service.orderedKeywords);

            cardData.id = cardData.title.replace(" ", "-").toLowerCase();

            var newCard = service.firebaseCards.push();
            var key = newCard.key();
            newCard.set(cardData, function(error) {
                // if (cardData.title.length > 0) {
                //     $scope.showSimpleToast("Success! You've added a new card called " + card.title);
                // }
                // else {
                //     $scope.showSimpleToast("Success! You've added a new card.");
                // }

                if (identityKey === undefined) { //$scope.addNewIdentity will sort the opening
                    service.addNewIdentity(key, cardData.title).then(function(identityKey) {
                        if (open) {
                            service.open(identityKey);
                        }
                    });
                }
                else {
                    if (open) {
                        service.open(identityKey);
                    }
                }

                service.algoliaAdd(newCard, key); // This needs to use callbacks etc
            });
        },

        addNewIdentity: function(initialCardKey, initialKeyword) { //Only call this function once the card has been created
            return $q(function(resolve, reject) {
                var newIdentity = service.firebaseIdentities.push().key();
                var identityKey = newIdentity.key();
                newIdentity.set({
                    cards: [{
                        key: initialCardKey,
                        rank: 0
                    }]
                }, function(error) {
                    var initialCard = service.firebaseCards.child(initialCardKey);
                    initialCard.update({
                        identity: identityKey
                    }, function(error) {
                        service.reImportCard(initialCardKey);
                        var newkeywordData = {
                            keyword: initialKeyword,
                            identityRef: identityKey
                        };
                        service.addNewKeyword(newkeywordData, false).then(function() {});
                    });
                });
            });
        },

        appendKeyword: function(keyword, identityKey) {
            var newkeyword = {
                keyword: keyword,
                identityRef: identityKey
            };
            service.addNewKeyword(newkeyword, true);
            return newkeyword;
        },

        addNewKeyword: function(newkeyword, showToast) {
            if (newkeyword.keyword.length < 1) {
                return;
            }
            newkeyword.keywordLength = newkeyword.keyword.length * -1;
            var newKeyword = service.firebaseKeywords.push();
            newKeyword.setWithPriority(newkeyword, newkeyword.keywordLength, function(error) { //Need to retrospectively set priorities for existing keywords (one time only)
                service.updateBiosFromKeyword(newkeyword.keyword);
                // if (showToast) {
                //     $scope.showSimpleToast("Success! You've added the keyword \"" + newkeyword.keyword + "\"");
                // }
            });
        },

        updateCard: function(key, card) {
            card.bio.structure = service.structureText(-1, card.bio.value, service.orderedKeywords);
            service.firebaseCards.child(key).update(card.data, function(error) {
                service.algoliaUpdate(key, card); // This needs to use callbacks etc
                service.reImportCard(key); // Is this necessary?
                // service.showSimpleToast("Success! You've updated the card " + card.title); //Shouldn't really display this until algoliaUpdate and reImportCard are complete
            });
        },

        deleteCard: function(key, card) {
            var title = card.title;
            var identityKey = card.identity;

            service.firebaseCards.child(key).remove(function() {
                service.cards.splice(service.cardKeyPos(key), 1);
                service.deleteIdentity(identityKey, title); //Needs to only be if the identity has no more cards left
                $scope.algoliaDelete(key); // This needs to use callbacks etc

                //The following should really only happen after various callbacks
                // $scope.showSimpleToast("Success! You've deleted the card " + title);
            });
        },

        deleteIdentity: function(identityKey, title) {
            //What happens to any of the identity's remaining cards?

            service.firebaseIdentities.child(identityKey).remove(function() {
                service.identities.splice(service.identityKeyPos(identityKey), 1);
                // $scope.algoliaDelete(key); //Need to add Identities to Algolia and work out what we can do with them
                service.deleteIdentityKeywords(identityKey);
                // service.showSimpleToast("Success! You've deleted the identity " + title);
            });
        },

        deleteKeyword: function(key) {
            service.firebaseKeywords.child(key).remove();
        },

        getIdentityKeywords: function(key) {
            return $q(function(resolve, reject) {
                var identityKeywords = [];
                service.firebaseKeywords.orderByChild("identityRef").equalTo(key).on("child_added", function(snapshot) {
                    var keyword = {
                        data: snapshot.val(),
                        objectID: snapshot.key()
                    };
                    identityKeywords.push(keyword);
                    resolve(identityKeywords);

                }, function(error) {
                    reject(-1);
                });
            });
        },

        getLinksfromText: function(structure) {
            var textLinks = [];
            for (var i = 0; i < structure.length; i++) {
                if (structure[i].type == 'link' & textLinks.indexOf(structure[i].ref) == -1) {
                    textLinks.push(structure[i].ref);
                }
            }
            return textLinks;
        },

        moveCardToFront: function(key) {
            for (var i = 0; i < service.cards.length; i++) {
                if (service.cards[i].objectID == key) {
                    service.cards[i].showing = true;
                    service.cards[i].atFront = true;
                }
                else {
                    service.cards[i].atFront = false;
                }
            }
        },

        openFromCardKey: function(cardKey) { //For now just selects identity from card and then acts as normal (so will select the most popular card from that identity)
            service.getCard(cardKey).then(function(card) {
                service.open(card.identity);
            });
        },

        open: function(identityKey) {
            service.getIdentity(identityKey).then(function(identity) {
                var cardKey = identity.data.cards[0].key; //Currently just selects the first card in the identity's 'cards' array

                service.getCard(cardKey).then(function(card) {
                    service.moveCardToFront(card.objectID);

                    //The stuff below is for importing the next set of cards before you click on any of them - needs testing and making sure it happens AFTER this card has loaded properly, so user doesn't notice
                    // var linkedCardsToImport = $scope.getLinksfromText($scope.localCards[localCardRef.ref].bio.structure);
                    // for (i = 0; i < linkedCardsToImport.length; i++) {
                    //     $scope.getIdentity(linkedCardsToImport[i]).then(function(localIdentityRef3) {
                    //         cardKey2 = $scope.localIdentities[localIdentityRef3.ref].cards[0].key;
                    //         $scope.getCard(cardKey2).then(function(localCardRef2) {
                    //         });
                    //     });
                    // }
                });
            });
        },

        close: function(key) {
            var pos = service.cardKeyPos(key);
            service.cards[pos].showing = false;
            service.cards[pos].atFront = false;
        },



        toggleEditMode: function() {
            service.editMode = !service.editMode;
            // if (editMode) {
            //     $scope.showSimpleToast("Edit mode is on");
            // }
            // else {
            //     $scope.showSimpleToast("Edit mode is off");
            // }
        },

        toggleEditCard: function(key) {
            var pos = service.cardKeyPos(key);
            service.cards[pos].editing = !service.cards[pos].editing;
        },


        populateFromWikipedia: function(cardData, inScope) {
            var title = cardData.title;
            $http.jsonp('https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&lllimit=500&titles=' + title + '&callback=JSON_CALLBACK&formatversion=2'). /* global $http */
            success(function(data) {
                // card.sources.push({title: 'Wikipedia', url: 'https://en.wikipedia.org/'}); //Needs if statement in case Wikipedia already listed
                if (cardData.bio === undefined) {
                    cardData.bio = {};
                }
                cardData.bio.value = service.nSentencesMChars(service.htmlToPlaintext(data.query.pages[0].extract), 2, 450);
                $http.jsonp('https://en.wikipedia.org/w/api.php?&format=json&&callback=JSON_CALLBACK&formatversion=2&action=query&titles=' + title + '&prop=pageimages&format=json&pithumbsize=200').
                success(function(data) {
                    if (cardData.image === undefined) {
                        cardData.image = {};
                    }
                    cardData.image.value = data.query.pages[0].thumbnail.source;
                    if (inScope) {
                        service.card = cardData; //Pretty sure this won't work now we're inside a service!
                    }
                    else {
                        return cardData;
                    }
                });
            });
        },

        htmlToPlaintext: function(text) {
            var text1 = String(text).replace(/<[^>]+>.<[^>]+>|\s\s+/gm, ' ').replace(/<[^>]+>|\;|\(.*\) |\(.*\)/gm, '').replace(/<[^>]+>.<[^>]+>|\s\s+/gm, ' ').replace('( ', '(');
            return text1.replace('&crarr;', ' ');
        },

        nSentencesMChars: function(text, n, m) {
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
        },

        structureText: function(id, text, keywords) {
            var structuredText = [{
                text: text,
                type: 'span'
            }];

            for (var j = 0; j < keywords.length; j++) {
                if (id == -1 || keywords[j].ref != id) {
                    for (var k = 0; k < structuredText.length;) {
                        if (structuredText[k].type != 'link') {
                            var text = structuredText[k].text
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
                                        ref: keywords[j].identityRef
                                    };
                                }
                                insert.pop(); //Remove the very last element
                                var newText = structuredText.slice(0, k);
                                newText = newText.concat(insert);
                                newText = newText.concat(structuredText.slice(k + 1, structuredText.length));
                                structuredText = newText;
                                k += insert.length - 1;
                            }
                        }
                        k++;
                    }
                }
            }
            return structuredText;
        },

        deleteIdentityKeywords: function(key) {
            service.firebaseKeywords.orderByChild("identityRef").equalTo(key).on("child_added", function(snapshot) {
                service.deleteKeyword(snapshot.key());
            });
        },

        reorderKeywords: function() { //Should render this unecessary by using Firebase's ordered lists with keywordLength as the ordering key
            return $q(function(resolve, reject) {
                service.orderedKeywords = [];
                service.firebaseKeywords.orderByChild("keywordLength").on("child_added", function(snapshot) {
                    service.orderedKeywords.push(snapshot.val());
                    resolve();
                }, function(error) {
                    reject(-1);
                });
            });
        },

        updateBiosFromKeyword: function(keywordText) {
            //Should this use Algolia to search through bios?
            //Slightly updated now we have localCards, but still not quite right
            service.reorderKeywords().then(function() {
                service.firebaseCards.on('child_added', function(snapshot) { //Should this be once() not on() to stop it continuing to do it?
                    var key = snapshot.key();
                    var bio = snapshot.val().bio.value;
                    if (bio.indexOf(keywordText) != -1) {
                        var structuredBio = service.structureText(key, bio, service.orderedKeywords);
                        service.firebaseCards.child(key).child('bio').child('structure').set(structuredBio);
                        if (service.cardImported(key)) {
                            service.reImportCard(key);
                        }
                    }
                });
            });
        },


        /* THe following updateAll... functions haven't been properly cleaned up as a lot of it is (hopefully) temporary anyway */

        updateAllIdentities: function() {
            var tempIdentityListOfCardKeys = [];
            service.firebaseIdentities.on('child_added', function(snapshot) { //Should this be once() not on() to stop it continuing to do it?
                service.firebaseCards.child(snapshot.val().cards[0].key).on('value', function(cardSnapshot) { //Should this be once() not on() to stop it continuing to do it?
                    if (tempIdentityListOfCardKeys.indexOf(cardSnapshot.key()) == -1) {
                        tempIdentityListOfCardKeys.push(cardSnapshot.key());
                    }
                    else {
                        // $scope.firebaseIdentities.child(snapshot.key()).remove();
                    }
                    if (!cardSnapshot.val().title) {
                        console.log('need to remove this identity: ', snapshot.val());
                        // $scope.firebaseIdentities.child(snapshot.key()).remove();
                        console.log('need to remove this card: ', cardSnapshot.val());
                        // $scope.firebaseCards.child(cardSnapshot.key()).remove();

                        service.firebaseKeywords.orderByChild("identityRef").equalTo(snapshot.key()).on("child_added", function(keywordSnapshot) {
                            console.log('need to remove this keyword: ', keywordSnapshot.val());
                            // $scope.firebaseIdentities.child(keywordSnapshot.key()).remove();
                        });
                    }
                });
                // $scope.firebaseCards.child(snapshot.val().cards[0].key).update({
                //     identity: snapshot.key()
                // });
            });
        },

        updateAllCards: function() {
            service.reorderKeywords(); //Need a callback here to finish this before proceeding

            service.firebaseCards.on('child_added', function(snapshot) { //Should this be once() not on() to stop it continuing to do it?
                var key = snapshot.key();
                if (!snapshot.val().title) {
                    console.log('need to remove this card2: ', snapshot.val());
                    // $scope.firebaseCards.child(key).remove();
                }
                else {
                    var bio = snapshot.val().bio.value;
                    var tempStructuredBio = service.structureText(key, bio, service.orderedKeywords);
                    service.firebaseCards.child(key).child('bio').child('structure').set(tempStructuredBio);
                    if (service.cardImported(key)) {
                        service.reImportCard(key);
                    }
                }
            });

            //Need multiple callbacks for this
            // $scope.showSimpleToast("Success! You've updated all cards.");






            // var successCount = 0;

            //temp
            // for (var i = 0; i < $scope.globalIdentities.length; i++) { //$scope.globalIdentities no longer exists!
            //     
            //     var identityKey = $scope.globalIdentities[i].objectID;
            //     var firstCardKey = $scope.globalIdentities[i].cards[0].key;
            //     $scope.globalCards.$getRecord(firstCardKey).identity = identityKey;
            // }


            // for (var i = 0; i < $scope.globalCards.length; i++) {
            //     if ($scope.globalCards[i].image) {
            //         // $scope.globalCards[i].image.value = $scope.globalCards[i].image.value.replace("//", "http://");
            //         // $scope.globalCards[i].image.value = $scope.globalCards[i].image.value.replace("https:http://", "https://");
            //     }
            //     $scope.globalCards[i].editing = false; //Shouldn't be necessary as this variable should only exist locally
            //     $scope.globalCards[i].justCreated = false; //Shouldn't be necessary as this variable should only exist locally
            //     var bio = $scope.globalCards[i].bio.value;
            //     $scope.globalCards[i].bio.structure = $scope.structureBio($scope.globalCards.$keyAt(i), bio, $scope.orderedKeywords);

            //     //Can delete this now???
            //     // if (!$scope.globalCards[i].identity) {
            //     //     $scope.addNewIdentity($scope.globalCards[i].objectID);
            //     // }

            //     $scope.globalCards.$save(i).then(function(ref) {
            //         var key = ref.key();
            //         successCount++;
            //         if ($scope.cardImported(key)) {
            //             $scope.reImportCard(key);
            //         }
            //         if (successCount == $scope.globalCards.length) {
            //             $scope.showSimpleToast("Success! You've updated all cards.");
            //         }
            //     });
            // }
        },

        updateAllKeywords: function() {
            service.firebaseKeywords.on('child_added', function(snapshot) {
                var tempKeywordLength = snapshot.val().keywordLength;
                // console.log('tempKeywordLength', tempKeywordLength);
                snapshot.ref().setPriority(tempKeywordLength);
                // console.log(snapshot.val().identityRef);
                service.firebaseIdentities.child(snapshot.val().identityRef).once('value', function(identitySnapshot) {
                    // console.log(snapshot.val().identityRef);
                    // console.log(identitySnapshot.val());
                }, function(error) {
                    service.firebaseKeywords.child(snapshot.key()).remove(function() { //Don't yet know whether this actually works!
                        // console.log("Keyword " + snapshot.val().keyword + " removed.");
                    });
                });
            });

            // for (var i = 0; i < $scope.keywords.length; i++) {
            //     $scope.keywords[i].identityRef = $scope.globalCards.$getRecord($scope.keywords[i].ref).identity;
            //     $scope.keywords[i].keywordLength = $scope.keywords[i].keyword.length * -1; //Maybe now not needed if this happens when new keyword created?

            //     $scope.keywords.$save(i);
            //     if ($scope.globalCards.$getRecord($scope.keywords[i].ref) === null) {
            //         $scope.keywords.$remove(i);
            //     }
            // }
        },

        updateEverything: function() {
            //All of this needs callbacks
            service.updateAllKeywords();
            service.updateAllCards();
            service.updateAllIdentities();
            // $scope.reorderKeywords($scope.updateAllCards);
            if (ctrlKeyDown) {
                service.reImportToAlgolia();
            }
        },

        toggleLogin: function() {
            if (service.loggedIn) {
                $rootScope.firebaseRef.unAuth(); //Doesn't currently work for some reason
            }
            else {
                service.logMeIn('twitter');
            }
        },

        logMeIn: function(loginProvider) {
            switch (loginProvider) {
                case 'twitter':
                    {
                        $rootScope.firebaseRef.authWithOAuthPopup("twitter", function(error, authData) {
                            if (error) {
                                console.log('twitter error');
                            }
                            else {
                                console.log('twitter success!');
                                service.loggedIn = true;
                                service.loginData = authData;
                                service.$apply();
                                // service.showSimpleToast("Hello " + authData.twitter.displayName + "! You're now logged in.");

                                service.firebaseUsersRef.once('value', function(snapshot) {
                                    // if (!snapshot.hasChild(authData.uid)) {
                                    service.firebaseUsers.child(authData.uid).update({
                                        uid: authData.uid,
                                        provider: authData.provider,
                                        name: authData.twitter.displayName,
                                        username: authData.twitter.username,
                                        image: authData.twitter.profileImageURL,
                                        url: "http://twitter.com/" + authData.twitter.username
                                    });
                                    // }
                                });
                            }
                        });
                    }
            }
        },

        allowEditMode: function() {
            if (service.loggedIn | godMode) {
                return true;
            }
            else {
                return false;
            }
        },

        cardBelongsToUser: function(card) {
            if (card.authorId == service.loginData.uid | godMode) {
                return true;
            }
            else {
                return false;
            }
        },

        cardCanBeClaimed: function(card) {
            if (service.loggedIn & card.authorId == undefined & !godMode) {
                return true;
            }
            else {
                return false;
            }
        },

        claimCard: function(key) {
            if (service.loggedIn) {
                service.firebaseCards.child(key).update({
                    authorId: service.loginData.uid
                }, function(error) {
                    service.reImportCard(key);
                    console.log('Error claiming card - trying a reImport.')
                });
            }
        },

        algoliaAdd: function(card, key) {
            var myObjectID = key;
            service.algoliaIndex.addObject(card, myObjectID, function(err, content) {


            });
        },

        algoliaUpdate: function(key, card) {


            card.objectID = key;
            card.$$conf = null; //Probably not necessary to delete all of this (only to prevent "TypeError: Converting circular structure to JSON" error)
            service.algoliaIndex.saveObject(card, function(err, content) {

                // 
            });
        },

        algoliaDelete: function(key) {
            service.algoliaIndex.deleteObject(key, function(error) {
                if (!error) {

                }
            });
        },





        reImportToAlgolia: function() { //Use this VERY RARELY!!!!!
            // Get all data from Firebase
            service.firebaseCards.on('value', reindexIndex);

            function reindexIndex(dataSnapshot) {
                // Array of objects to index
                var objectsToIndex = [];

                // Create a temp index
                var tempIndexName = 'cards_temp';
                var tempIndex = $rootScope.clientAlgolia.initIndex(tempIndexName);

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
                service.algoliaIndex.saveObjects(objectsToIndex, function(err, content) {
                    if (err) {
                        throw err;
                    }

                    // Overwrite main index with temp index
                    $rootScope.clientAlgolia.moveIndex(tempIndexName, 'cards', function(err, content) {
                        if (err) {
                            throw err;
                        }
                    });
                });
            }
        }

    };

    return service;

}]);






app.directive('ngToast', ['$mdToast', function($mdToast) { // Not yet connected up to other services/controllers
    return {
        restrict: 'E',
        // require: 'ExplaainCtrl',
        link: function(scope, elem, attrs) {

            scope.toastPosition = {
                bottom: false,
                top: true,
                left: false,
                right: true
            };

            scope.getToastPosition = function() {
                return Object.keys(scope.toastPosition)
                    .filter(function(pos) {
                        return scope.toastPosition[pos];
                    })
                    .join(' ');
            };

            scope.showSimpleToast = function(message) {
                $mdToast.show(
                    $mdToast.simple()
                    .content(message)
                    .position(scope.getToastPosition())
                    .hideDelay(3000)
                );
            };
        }
    }
}]);












app.directive('ngCard', function() {
    return {
        restrict: 'E',
        require: 'ExplaainCtrl',
        templateUrl: 'html/card.html'
    }
});

app.directive('ngCardFormat', ["$compile", '$http', '$templateCache', '$parse', function($compile, $http, $templateCache, $parse) {
    return {
        restrict: 'E',
        // require: 'ExplaainCtrl',
        templateUrl: 'html/cards/profile.html',
        // scope: {
        //     card: '=card',
        //     eventHandler: '&ngClick'
        // },
        link: function(scope, element, attrs) {

            scope.$watch(attrs.format, function(value) {
                if (value) {
                    value = 'html/cards/' + value + '.html';
                    loadTemplate(value);
                }
            });

            function loadTemplate(format) {

                $http.get(format, {
                        cache: $templateCache
                    })
                    .success(function(templateContent) {
                        element.replaceWith($compile(templateContent)(scope));
                    });
            }
        }
    }
}]);

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

app.directive('ngStructuredText', function() {
    return {
        restrict: 'EA',
        require: 'ExplaainCtrl',
        templateUrl: 'html/components/structured-text.html',
        controller: function($scope, $element) {
            $scope.reverse = function(ref) {
                cardToOpen = ref;
                $scope.openCard();
            }
        },
        scope: {
            text: '=data',
            card: '=',
            reverse: '&',
            openCard: '&',
            editing: '='
                // open: '&',
                // eventHandler: '&ngClick'
        }
    }
});

app.directive('ngImage', function() {
    return {
        restrict: 'E',
        // require: 'ExplaainCtrl',
        templateUrl: 'html/components/image.html',
        link: function(scope, elem, attrs) {

            }
            // scope: {
            //     image: '=',
            //     backupImageSrc: '=backup',
            //     card: '=card',
            //     editing: '='
            // }
    }
});

app.directive('ngTitle', function() {
    return {
        restrict: 'E',
        require: 'ExplaainCtrl',
        templateUrl: 'html/components/title.html',
        scope: {
            title: '=',
            card: '=card',
            editing: '='
        }
    }
});

app.directive('ngSubtitle', function() {
    return {
        restrict: 'E',
        require: 'ExplaainCtrl',
        templateUrl: 'html/components/subtitle.html',
        scope: {
            subtitle: '=',
            card: '=card',
            editing: '='
        }
    }
});

app.directive('ngCredits', function() {
    return {
        restrict: 'E',
        require: 'ExplaainCtrl',
        templateUrl: 'html/components/credits.html',
        scope: {
            card: '=card',
            editing: '='
        }
    }
});

app.directive('ngAuthor', function() {
    return {
        restrict: 'E',
        require: 'ExplaainCtrl',
        templateUrl: 'html/components/author.html',
        scope: {
            author: '=',
            card: '=card',
            editing: '='
        }
    }
});

app.directive('ngSources', function() {
    return {
        restrict: 'E',
        require: 'ExplaainCtrl',
        templateUrl: 'html/components/sources.html',
        scope: {
            sources: '=',
            card: '=card',
            editing: '='
        }
    }
});

app.directive('ngFormat', function() {
    return {
        restrict: 'E',
        require: 'ExplaainCtrl',
        templateUrl: 'html/components/format.html',
        scope: {
            format: '=',
            formatOptions: '=',
            card: '=card',
            editing: '='
        }
    }
});

app.directive('ngEmbed', function() {
    return {
        restrict: 'E',
        require: 'ExplaainCtrl',
        templateUrl: 'html/components/embed.html',
        scope: {
            embed: '=',
            card: '=card',
            editing: '='
        }
    }
});








app.filter("sanitize", ['$sce', function($sce) {
    return function(htmlCode) {
        return $sce.trustAsHtml(htmlCode);
    }
}]);
