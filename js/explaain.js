function clog(myText) {
    console.log(myText);
};

function clogyo() {
    console.log('yo');
};


var ctrlKeyDown = false;
var cardToOpen = ''; //This is not a good way of doing it

var godMode = true;

var myScope;

var app = angular.module('app', ['firebase', 'ngMaterial', 'algoliasearch', 'ngRoute', 'ngSanitize']).
controller('ExplaainCtrl', function($scope, $timeout, $firebaseArray, $firebaseObject, $http, $mdToast, $mdSidenav, algolia) {

    myScope = $scope;

    var clientAlgolia = algoliasearch('RR6V7DE8C8', 'b96680f1343093d8822d98eb58ef0d6b');
    var indexAlgolia = clientAlgolia.initIndex(algoliaIndex);

    $scope.localUsers = [];
    $scope.localCards = [];
    $scope.localIdentities = [];
    //Remember the positions of objects in the $scope.cards array don't match up to the positions of objects in the $scope.localCards array
    $scope.localUserRefs = {};
    $scope.localCardRefs = {};
    $scope.localIdentityRefs = {};

    $scope.firebaseRef = new Firebase(firebaseRoot);
    var firebaseUsersRef = $scope.firebaseRef.child("users");
    $scope.globalUsers = $firebaseArray(firebaseUsersRef);
    var firebaseCardsRef = $scope.firebaseRef.child("cards");
    $scope.globalCards = $firebaseArray(firebaseCardsRef);
    var firebaseIdentitiesRef = $scope.firebaseRef.child("identities");
    $scope.globalIdentities = $firebaseArray(firebaseIdentitiesRef);

    var keywordsRef = new Firebase(firebaseRoot + "/keywords");
    $scope.keywords = $firebaseArray(keywordsRef);

    $scope.firstCard = true;
    $scope.importWatch = false;
    $scope.importCardWatch = false;
    $scope.importCardWatch1 = false;
    $scope.cardOpened = false;
    $scope.identityKeyTemp;
    $scope.initialCardKeyTemp;
    $scope.localCardRefTemp;

    $scope.loggedIn = false;
    $scope.loginData = {};

    $scope.frontCard;
    $scope.editMode = false;


    $scope.formatOptions = [
        'profile',
        'quote'
    ];




    $scope.showingFilter = function(card) {
        var localCardRef = $scope.localCardRefs[card.$id];
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
        return $scope.localCardRefs[key];
    };

    $scope.importIdentity = function(key) {
        var tempIndentitiesRef = new Firebase(firebaseRoot + "/identities/" + key);
        var newIdentity = $firebaseObject(tempIndentitiesRef);
        $scope.localIdentities.push(newIdentity);




        $scope.localIdentityRefs[key] = {};
        $scope.localIdentityRefs[key].ref = $scope.localIdentities.length - 1;
        // $scope.localIdentityRefs[key].keywords = $scope.getCardKeywords(key); //Need to add this in



        newIdentity.$loaded().then(function(data) {
            // $scope.importCard(newIdentity.cards[0].key);
            $scope.importWatch = true;
        });


        return $scope.localIdentityRefs[key];
    };

    $scope.importCard = function(key) {
        var tempCardsRef = new Firebase(firebaseRoot + "/cards/" + key);
        var newCard = $firebaseObject(tempCardsRef);

        console.log(newCard);
        newCard.$loaded().then(function(data) {
            console.log(newCard);

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
        $scope.localCardRefs[key].keywords = $scope.getCardKeywords(key);
        return $scope.localCardRefs[key];
    };

    $scope.reImportCard = function(key) {
        var tempCardsRef = new Firebase(firebaseRoot + "/cards/" + key);
        var card = $scope.localCards[$scope.localCardRefs[key]];
        // $scope.localCardRefs[key].keywords = $scope.getCardKeywords(key);
        card = $firebaseObject(tempCardsRef);
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

    $scope.getCardKeywords = function(key) {
        var cardKeywords = [];
        tempScopeKeywordsRef.orderByChild("ref").equalTo(key).on("child_added", function(snapshot) {
            var keyword = snapshot.val();
            keyword.$id = snapshot.key();
            cardKeywords.push(keyword);
        });
        return cardKeywords;
    };

    $scope.openFromCardKey = function(cardKey) { //For now just selects identity from card and then acts as normal (so will select the most popular card from that identity)

        console.log(cardKey);

        if (cardKey === undefined) {
            cardKey = cardToOpen;
            if (cardKey === undefined || cardKey == "") {
                console.log("giving up");
                return;
            }
        }

        var localCardRef = $scope.localCardRefs[cardKey];
        if (localCardRef === undefined) {
            localCardRef = $scope.importCard(cardKey);
        }
        else {
            var card = $scope.localCards[localCardRef.ref];
            var identityKey = card.identity;
            $scope.open(identityKey);
        }

        console.log(localCardRef);
        $scope.localCardRefTemp = localCardRef;

        $scope.$watch('importCardWatch1', function(newValue, oldValue) { //May not yet be working for cards that don't need to be imported...
            console.log('hello');

            if ($scope.importCardWatch1) {
                $scope.importCardWatch1 = false;
                var card = $scope.localCards[$scope.localCardRefTemp.ref];
                var identityKey = card.identity;
                console.log(card);
                console.log(identityKey);

                $scope.open(identityKey);
            }
        });

    };

    $scope.open = function(identityKey) {
        var cardKey;

        if (identityKey === undefined) {
            identityKey = cardToOpen;
            if (identityKey === undefined || identityKey == "") {

                return;
            }
        }
        $scope.identityKeyTemp = identityKey;

        var localIdentityRef = $scope.localIdentityRefs[identityKey];
        if (localIdentityRef === undefined) {
            localIdentityRef = $scope.importIdentity(identityKey);
        }
        else {
            cardKey = $scope.localIdentities[$scope.localIdentityRefs[identityKey].ref].cards[0].key;

            var localCardRef = $scope.localCardRefs[cardKey];


            if (localCardRef === undefined) {
                localCardRef = $scope.importCard(cardKey);
                $scope.localCardRefTemp = localCardRef;
            }
        }



        $scope.$watch('importWatch', function(newValue, oldValue) { //May not yet be working for cards that don't need to be imported...


            if ($scope.importWatch) {

                $scope.importWatch = false;

                console.log($scope.identityKeyTemp);
                console.log($scope.localIdentityRefs);
                console.log($scope.localIdentities);
                cardKey = $scope.localIdentities[$scope.localIdentityRefs[$scope.identityKeyTemp].ref].cards[0].key;

                var localCardRef = $scope.localCardRefs[cardKey];


                if (localCardRef === undefined) {
                    localCardRef = $scope.importCard(cardKey);
                    $scope.localCardRefTemp = localCardRef;
                }
                else {

                    $scope.localCardRefTemp.showing = true;
                    $scope.localCardRefTemp.atFront = true;
                    $scope.localCardRefTemp.editing = false;

                    $scope.cardOpened = true;

                    return card;

                }
            }
        });

        $scope.$watch('importCardWatch', function(newValue, oldValue) {

            if ($scope.importCardWatch) {
                $scope.importCardWatch = false;
                var card = $scope.localCards[$scope.localCardRefTemp.ref];
                for (var i = 0; i < $scope.localCards.length; i++) {
                    $scope.localCards[i].atFront = false;
                }

                $scope.localCardRefTemp.showing = true;
                $scope.localCardRefTemp.atFront = true;
                $scope.localCardRefTemp.editing = false;

                $scope.cardOpened = true;

                return card;
            }
        });


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

    $scope.addNewIdentity = function(initialCardKey, initialKeyword, open) { //Only call this function once the card has been created
        var newIdentity = {
            cards: [{
                key: initialCardKey,
                rank: 0
            }]
        };

        // var initialKeyword = $scope.localCards[$scope.localCardRefs[initialCardKey].ref].title;

        $scope.globalIdentities.$add(newIdentity).then(function(ref) {
            var identityKey = ref.key();
            $scope.identityKeyTemp = identityKey;
            $scope.initialCardKeyTemp = initialCardKey;

            // $scope.globalCards.$getRecord(initialCardKey).identity = identityKey;
            // $scope.globalCards.$getRecord(initialCardKey).$save().then(function(ref) {
            //     
            //     
            // });

            if (open) {
                $scope.open(identityKey);
            }

            $scope.$watch('cardOpened', function(newValue, oldValue) {
                if ($scope.cardOpened) {
                    $scope.cardOpened = false;
                    console.log($scope.localCardRefs);
                    $scope.localCards[$scope.localCardRefs[$scope.initialCardKeyTemp].ref].indentity = $scope.identityKeyTemp;

                    console.log('Should now have card and identity both linked:');
                    // console.log($scope.localIdentities[$scope.localIdentityRefs[identityKey].ref]);
                    console.log($scope.localCards[$scope.localCardRefs[initialCardKey].ref]);

                    console.log(tempCardssRef);
                    var tempCardssRef = new Firebase(firebaseRoot + "/cards/" + $scope.initialCardKeyTemp);
                    tempCardssRef.update({
                        identity: $scope.identityKeyTemp
                    });
                    console.log(tempCardssRef);

                    // var newIdentity = $firebaseObject(tempIndentitiesRef);

                    // $scope.globalCards.$save(card).then(function(ref) {
                    //     var key = ref.key();
                    //     console.log(key);
                    //     console.log($scope.globalCards);
                    // });
                }
            });


            var newkeyword = {
                keyword: initialKeyword,
                identityRef: identityKey
            };
            $scope.addNewKeyword(newkeyword, false);


        });
    };

    $scope.addNewCard = function(card, open, justCreated, autoPopulate) {
        //This needs to be passed into the function, not created here
        var cardIdentityKey = undefined;

        card.dateCreated = Date.now();
        card.authorId = $scope.loginData.uid;
        card.sources = [];

        card.format = prompt("What format should the new card take?", "profile")

        if (card.format === undefined) {
            card.format = 'profile';
        }
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

            if (cardIdentityKey === undefined) { //$scope.addNewIdentity will sort the opening
                console.log(key);
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
            identityRef: card.$id
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

    $scope.deleteIdentityKeywords = function(key) {
        var tempKeywordsRef = new Firebase(firebaseRoot + "/keywords");
        tempKeywordsRef.orderByChild("identityRef").equalTo(key).on("child_added", function(snapshot) {
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
        // var allCards = $firebaseArray(firebaseCardsRef);

        //temp
        // for (var i = 0; i < $scope.globalIdentities.length; i++) {
        //     
        //     var identityKey = $scope.globalIdentities[i].$id;
        //     var firstCardKey = $scope.globalIdentities[i].cards[0].key;
        //     $scope.globalCards.$getRecord(firstCardKey).identity = identityKey;
        // }

        for (var i = 0; i < $scope.globalCards.length; i++) {
            if ($scope.globalCards[i].image) {
                // $scope.globalCards[i].image.value = $scope.globalCards[i].image.value.replace("//", "http://");
                // $scope.globalCards[i].image.value = $scope.globalCards[i].image.value.replace("https:http://", "https://");
            }
            $scope.globalCards[i].editing = false; //Shouldn't be necessary as this variable should only exist locally
            $scope.globalCards[i].justCreated = false; //Shouldn't be necessary as this variable should only exist locally
            var bio = $scope.globalCards[i].bio.value;
            $scope.globalCards[i].bio.structure = $scope.structureBio($scope.globalCards.$keyAt(i), bio, $scope.orderedKeywords);

            //Can delete this now
            // if (!$scope.globalCards[i].identity) {
            //     $scope.addNewIdentity($scope.globalCards[i].$id);
            // }

            $scope.globalCards.$save(i).then(function(ref) {
                var key = ref.key();
                successCount++;
                if ($scope.cardImported(key)) {
                    $scope.reImportCard(key);
                }
                if (successCount == $scope.globalCards.length) {
                    $scope.showSimpleToast("Success! You've updated all cards.");
                }
            });
        }
    };

    $scope.updateAllKeywords = function() {
        for (var i = 0; i < $scope.keywords.length; i++) {
            $scope.keywords[i].identityRef = $scope.globalCards.$getRecord($scope.keywords[i].ref).identity;
            $scope.keywords[i].keywordLength = $scope.keywords[i].keyword.length * -1; //Maybe now not needed if this happens when new keyword created?
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
        // card.image.value = card.image.value.replace("http://", "//");
        // card.image.value = card.image.value.replace("https://", "//");
        $scope.globalCards.$save(card).then(function(ref) {
            localCardRef.editing = false;
            $scope.algoliaUpdate(key, card);
            $scope.showSimpleToast("Success! You've updated the card " + card.title);
        });
    };

    $scope.deleteCard = function(key, card) {
        var title = card.title;
        var identityKey = card.identity;

        var index = $scope.globalCards.$indexFor(key);

        $scope.globalCards[index] = card;

        $scope.localCards.splice($scope.localCardRefs[key].ref, 1);

        $scope.globalCards.$remove(card).then(function(ref) {
            $scope.deleteIdentity(identityKey, title);

            // $scope.deleteCardKeywords(key);

            $scope.algoliaDelete(key);

            $scope.showSimpleToast("Success! You've deleted the card " + title);
        });
    };

    $scope.deleteIdentity = function(identityKey, title) {

        var index = $scope.globalIdentities.$indexFor(identityKey);

        var identityToRemove = new Firebase(firebaseRoot + "/identities/" + identityKey);

        console.log(identityKey);
        console.log($scope.localIdentityRefs);
        $scope.localIdentities.splice($scope.localIdentityRefs[identityKey].ref, 1);

        identityToRemove.remove($scope.afterDeleteIdentity(identityKey, title));
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

                            $scope.firebaseRef.child("users").once('value', function(snapshot) {
                                // if (!snapshot.hasChild(authData.uid)) {
                                $scope.firebaseRef.child("users").child(authData.uid).set({
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

    $scope.cardBelongsToUser = function(card) {
        if (card.authorId == $scope.loginData.uid | godMode) {
            return true;
        }
        else {
            return false;
        }
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

});




app.filter("sanitize", ['$sce', function($sce) {
    return function(htmlCode) {
        return $sce.trustAsHtml(htmlCode);
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
        require: 'ExplaainCtrl',
        templateUrl: 'html/components/image.html',
        scope: {
            image: '=',
            backupImageSrc: '=backup',
            card: '=card',
            editing: '='
        }
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
