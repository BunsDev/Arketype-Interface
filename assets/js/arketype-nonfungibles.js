(function() {
    'use strict';

    $(function() {
        $(app).on('authenticated', function() {
            window.venlyConnect.api.getWallets({secretType: 'ETHEREUM'})
                  .then(function(wallets) {
                      app.log(wallets, 'Wallets');
                      wallets = wallets.filter((wallet) => wallet.walletType !== 'APPLICATION');
                      app.page.wallets = wallets;
                      updateWallets(wallets);
                      if (!app.page.initialised) {
                          app.page.addConnectEvents('.get-wallets', getWallets);
                          initGetWalletEvent();
                          initTransactionForm();
                          initSelectWallet();
                          initSelectToken();
                          app.page.initialised = true;

                      }
                  });
        });
    });

    function getSelectedSecretType() {
        var type = $('select[name="type"]').val();
        return type !== 'undefined' && type.length > 0 ? type : 'ETHEREUM';
    }

    function getWallets(el) {
        window.venlyConnect.api.getWallets({secretType: getSelectedSecretType()})
              .then(function(wallets) {
                  if (el) {
                      el.dataset.success = 'true';
                  }
                  app.log(wallets, 'Wallets');
                  wallets = wallets.filter((wallet) => wallet.walletType !== 'APPLICATION');
                  app.page.wallets = wallets;
                  updateWallets(wallets);
              });
    }

    function getTokens(walletId) {
        if (walletId) {
            window.venlyConnect.api.getNonfungibles(walletId)
                  .then(function(nonfungibles) {
                      app.log(nonfungibles, 'Nonfungibles');
                      app.page.tokens = nonfungibles;
                      updateTokens(walletId, nonfungibles);
                  });
        } else {
            app.log('No walletId provided in getTokens');
        }
    }

    function initSelectToken() {
        $('select[name="tokenIdSel"]').on('change', function() {
            fillTokenDetails($(this).val())
        });
    }

    function initSelectWallet() {
        $('select[name="walletId"]').on('change', function() {
            walletUpdated();
        });
    }

    function walletUpdated() {
        var $wallet = $('select[name="walletId"]');
        var walletId = $wallet.val();
        var address = $wallet.find('option[value="' + walletId + '"]').data('address');
        getTokens(walletId);
    }

    function initGetWalletEvent() {
        document.querySelectorAll('.get-wallets')
                .forEach(function(el) {
                    el.addEventListener('click', function() {
                        getWallets(el);
                    });
                });
    }

    function initTransactionForm() {
        var formTx = document.querySelector('[data-form="nonfungibles"]');
        if (formTx) {
            formTx.addEventListener('submit', function(e) {
                e.stopPropagation();
                e.preventDefault();

                var walletId = $('select[name="walletId"]', formTx).val();
                var to = $('input[name="to"]', formTx).val();
                var from = $('input[name="from"]', formTx).val();
                var chainSpecificFields = $('input[name="chainSpecificFields"]', formTx).val();
                chainSpecificFields = chainSpecificFields !== null && chainSpecificFields.length>0 ? JSON.parse(chainSpecificFields) : null;
                var tokenAddress = $('input[name="tokenAddress"]', formTx).val();
                var tokenIdInp = $('input[name="tokenIdInp"]', formTx).val();
                var tokenIdSel = $('select[name="tokenIdSel"]', formTx).val();
                var tokenId = tokenIdInp ? tokenIdInp : tokenIdSel;
                var wallet = app.page.wallets.find((w) => w.id === walletId);
                const transactionRequest = {
                    secretType: wallet.secretType, walletId, to, chainSpecificFields, from, tokenAddress, tokenId
                };
                if (wallet.secretType === 'ETHEREUM' && !transactionRequest.network) {
                    transactionRequest.network = {
                        name: 'Rinkeby',
                        nodeUrl: 'https://rinkeby.arkane.network',
                    };
                }
                app.log(transactionRequest, 'Executing NFT Transfer');
                executeNftTransfer(transactionRequest);
            });
        }
    }

    function updateWallets(wallets) {
        var $walletsSelect = $('select[name="walletId"]');
        $walletsSelect && $walletsSelect.empty();
        if (wallets) {
            wallets.filter(
                wallet => wallet.secretType === getSelectedSecretType())
                   .forEach(
                       wallet => $walletsSelect.append($(
                           '<option>',
                           {value: wallet.id, text: buildWalletLabel(wallet), 'data-address': wallet.address}
                       )));
            walletUpdated();
        }
    }

    function updateTokens(walletId,
                          tokens) {
        var localWalletId = $('select[name="walletId"]').val();
        var $tokenSelect = $('select[name="tokenIdSel"]');
        var $tokenAddress = $('input[name="tokenAddress"]');
        $tokenSelect && $tokenSelect.empty();
        $tokenAddress.val('');
        if (localWalletId === walletId && tokens && tokens.length > 0) {
            fillTokenDetails(tokens[0].id);
            $tokenAddress.val(tokens[0].contract.address);
            tokens.forEach(
                token => $tokenSelect.append($('<option>', {value: token.id, text: buildTokenLabel(token)})))
        } else {
            fillTokenDetails();
        }
    }

    function executeNftTransfer(executeData) {
        window.venlyConnect.createSigner().executeNftTransfer(executeData)
              .then(function(result) {
                  app.log(result);
              })
              .catch(function(err) {
                  app.error(err);
              });
    }

    function fillTokenDetails(tokenId) {
        var token;
        if (typeof tokenId !== undefined && app.page.tokens) {
            token = app.page.tokens.find((token) => token.id === tokenId);
        }
        var $tokenName = $('#token-name');
        var $tokenDescription = $('#token-description');
        var $tokenUrl = $('#token-url');
        var $tokenImage = $('#token-image');

        $tokenImage.attr('src', '');
        $tokenName.text('');
        $tokenDescription.text('');
        $tokenUrl.text('');

        if (token) {
            $tokenName.text(token.name);
            $tokenDescription.text(token.description);
            $tokenUrl.text(token.url);
            if (token.imageUrl) {
                $tokenImage.attr('src', token.imageUrl);
            }
        }

        fillContractDetails(tokenId);
    }

    function fillContractDetails(tokenId) {
        var contract;
        if (typeof tokenId !== undefined && app.page.tokens) {
            var token = app.page.tokens.find((token) => token.id === tokenId);
            if (token) {
                contract = token.contract;
            }
        }
        var $contractAddress = $('input[name="tokenAddress"]');
        var $contractName = $('#token-contract-name');
        var $contractDescription = $('#token-contract-description');
        var $contractSymbol = $('#token-contract-symbol');
        var $contractUrl = $('#token-contract-url');
        var $contractImage = $('#token-contract-image');
        $contractAddress.val('');
        $contractName.text('');
        $contractDescription.text('');
        $contractSymbol.text('');
        $contractUrl.text('');
        $contractImage.attr('src', '');
        if (contract) {
            $contractAddress.val(contract.address);
            $contractName.text(contract.name);
            $contractDescription.text(contract.description);
            $contractSymbol.text(contract.symbol);
            $contractUrl.text(contract.url);
            if (contract.imageUrl) {
                $contractImage.attr('src', contract.imageUrl);
            }
        }
    }

    function buildWalletLabel(wallet) {
        return wallet.description ? wallet.description + ' - ' + wallet.address : wallet.address;
    }

    function buildTokenLabel(token) {
        return token.name ? token.id + ' - ' + token.name : token.id;
    }

})();
