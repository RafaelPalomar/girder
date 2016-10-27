import View from 'girder/views/View';

import TreeWidget from './tree';
import DetailsWidget from './details';

import body from '../templates/body.pug';
import '../stylesheets/body.styl';

var TreeviewBody = View.extend({
    initialize: function (settings) {
        this.tree = new TreeWidget({
            mockMutations: true,
            edit: true,
            dragAndDrop: true,
            persist: true,
            parentView: this
        });
        this.details = new DetailsWidget({
            parentView: this
        });
        this.listenTo(this.tree, 'focus', this.showDetails);
        this.render();
    },
    render: function () {
        this.$el.html(body());
        this.tree.setElement(this.$('.g-treeview-widget')).render();
        this.details.setElement(this.$('.g-treeview-details')).render();
    },
    showDetails: function (model) {
        this.details.showModel(model);
    }
});

export default TreeviewBody;
