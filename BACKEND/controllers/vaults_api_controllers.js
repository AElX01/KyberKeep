const { v4: uuid } = require('uuid');
const Vault = require('../models/vaults');

exports.updateLoginInfo = async (req, res) => {
    const { sub: email } = req.user;
    const entryId = req.params.entry;
  
    try {
      const vault = await Vault.findOne({ email });
      if (!vault) return res.status(404).send("Vault not found");
  
      const entry = vault.encrypted_vault.id(entryId);
      if (!entry) return res.status(404).send("Entry not found");
  
      entry.item_name = req.body.item_name;
      entry.url = req.body.url;
      entry.encrypted_data = req.body.encrypted_data;
  
      await vault.save();
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
        let entryToClone = await vault.encrypted_vault.id(req.params.entry);

        let item_name = entryToClone.item_name;
        let url = entryToClone.url;
        let encrypted_data = entryToClone.encrypted_data;

        const newEntry = {
            item_name,
            url,
            encrypted_data
        };

        const updatedVault = await Vault.findOneAndUpdate(
            { email },
            { $push: { encrypted_vault: newEntry } },
            { new: true }
        );

        res.sendStatus(200);

    } catch (err) {
        res.status(400).send('an error ocurred');
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
        } else if (/^[a-zA-Z]+$/.test(req.params.toGet)) {
            const searchTerm = req.params.toGet.toLowerCase();
            const match = vault.encrypted_vault.filter(obj => obj.item_name.toLocaleLowerCase().includes(searchTerm));

            res.status(200).json({ entries: match});
        } else {
            const element = await vault.encrypted_vault.id(req.params.toGet);
            res.status(200).send(element);
        }
    } catch(err) {
        res.sendStatus(500);
    }
}

exports.deleteLoginInfo = async (req, res) => {
    const { sub: email } = req.user;
  
    try {
        await Vault.updateOne(
            { email },
            { $pull: { encrypted_vault: { _id: req.params.entry } } }
        );
  
      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.status(500).send("Could not delete entry");
    }
  };
  