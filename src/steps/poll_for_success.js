const get = require("../util/get");
const Config = require("../config");

// TODO should this poll?
module.exports = {
  instruction: "Start polling the bridge for success",
  action: "GET /transaction (SEP6)",
  execute: async function(
    state,
    { request, response, instruction, error, setDevicePage }
  ) {
    return new Promise((resolve, reject) => {
      const BRIDGE_URL = Config.get("BRIDGE_URL");
      const poll = async () => {
        const transactionParams = {
          id: state.stellar_memo
        };
        request("GET /transaction", transactionParams);
        const transactionResult = await get(
          `${BRIDGE_URL}/transaction`,
          transactionParams
        );
        response("GET /transaction", transactionResult);
        if (transactionResult.transaction.status === "completed") {
          state.external_transaction_id =
            transactionResult.transaction.externalTransactionId;
          instruction(
            "Success!  You can pick up your cash at a storefront with reference number " +
              state.external_transaction_id
          );
          if (transactionResult.transaction.url) {
            setDevicePage(transactionResult.transaction.url);
          } else {
            setDevicePage(
              "pages/receipt.html?reference_number=" +
                state.external_transaction_id
            );
          }
          resolve();
        } else if (
          ["pending_external", "pending_anchor", "pending_stellar"].indexOf(
            transactionResult.transaction.status
          ) != -1
        ) {
          instruction(
            `Status is ${
              transactionResult.transaction.status
            }, lets retry in 2s`
          );
          setTimeout(poll, 2000);
        } else {
          error(
            `Status is ${
              transactionResult.transaction.status
            }, something must have gone wrong`
          );
        }
      };
      poll();
    });
  }
};
