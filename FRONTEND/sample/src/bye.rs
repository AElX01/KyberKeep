use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn say_bye() {
    web_sys::console::log_1(&"goodBye".into());
}