import * as Comlink from 'comlink';

console.log('🚀 Test worker starting...');

const obj = {
  counter: 0,

  async inc() {
    console.log('📈 Incrementing counter from', this.counter);
    this.counter++;
    console.log('📈 Counter is now', this.counter);
  },

  async getCounter() {
    console.log('📊 Getting counter value:', this.counter);
    return this.counter;
  }
};

console.log('🔧 Exposing test worker service...');
Comlink.expose(obj);
console.log('✅ Test worker ready!');
