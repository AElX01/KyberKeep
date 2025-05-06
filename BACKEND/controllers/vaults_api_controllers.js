const { v4: uuid } = require('uuid');
const Vault = require('../models/vaults');

exports.updateLoginInfo = async (req, res) => {
    const { sub: email } = req.user;
    const entryIndex = req.params.entry;
  
    try {
      const update = {
        [`encrypted_vault.${entryIndex}.item_name`]: req.body.item_name,
        [`encrypted_vault.${entryIndex}.url`]: req.body.url,
        [`encrypted_vault.${entryIndex}.encrypted_data`]: req.body.encrypted_data
      };
  
      const result = await Vault.updateOne({ email }, { $set: update });
  
      if (result.modifiedCount === 0) {
        return res.status(404).send("No changes made or entry not found.");
      }
  
      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.status(500).send("Could not update login information");
    }
};
  

exports.createVault = async (req, res) => {
    const { email } = req.body;

    const vault = new Vault({
        email,
        encrypted_vault: []
    });

    try {
        const sample = await Vault.findOne({ email });
        if (sample) {
            return res.sendStatus(400);
        }
        const saved = await vault.save();
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
}

exports.cloneEntry = async (req, res) => {
    const { sub: email } = req.user;

    try {
        let vault = await Vault.findOne({ email });
        let entryToClone = vault.encrypted_vault[req.params.entry];

        const updatedVault = await Vault.findOneAndUpdate(
            { email },
            { $push: { encrypted_vault: entryToClone } },
            { new: true }
        );

        res.sendStatus(200);

    } catch (err) {
        console.log(err);
    }
}

exports.addEntry = async (req, res) => {
    const { sub: email } = req.user;
    const { encrypted_data, item_name, url } = req.body;
    const newEntry = {
        item_name,
        url,
        encrypted_data
    };

    try {
        const updatedVault = await Vault.findOneAndUpdate(
            { email },
            { $push: { encrypted_vault: newEntry } },
            { new: true }
        );

        if (!updatedVault) {
            return res.status(404).send('Vault not found');
        }

        res.sendStatus(201);
    } catch(err) {
        res.sendStatus(400);
    }
}

exports.getLoginInfo = async (req, res) => {
    const { sub: email } = req.user;

    try {
        const vault = await Vault.findOne({ email });

        if (req.params.toGet === 'all') {
            if (!vault) {
                return res.sendStatus(404);
            }

            res.status(200).json({ entries: vault.encrypted_vault });
        } else {
            res.status(200).send(vault.encrypted_vault[req.params.toGet]);
        }
    } catch(err) {
        res.sendStatus(500);
    }
}

exports.deleteLoginInfo = async (req, res) => {
    const { sub: email } = req.user;
    const entryIndex = parseInt(req.params.entry, 10);
  
    try {

      await Vault.updateOne(
        { email },
        { $unset: { [`encrypted_vault.${entryIndex}`]: 1 } }
      );
  
      await Vault.updateOne(
        { email },
        { $pull: { encrypted_vault: null } }
      );
  
      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.status(500).send("Could not delete entry");
    }
  };
  