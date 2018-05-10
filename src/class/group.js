import {
  Project,
  Line,
  Hole,
  Item,
  Area,
  Layer
} from './export';
import { List } from 'immutable';
import { Group as GroupModel } from '../models';
import { history, IDBroker } from '../utils/export';

class Group{

  static select( state, groupID ){
    let layerList = state.getIn([ 'scene', 'groups', groupID, 'elements' ]);

    state = Project.setAlterate( state ).updatedState;

    layerList.entrySeq().forEach( ([groupLayerID, groupLayerElements]) => {
      state = Layer.unselectAll( state, groupLayerID ).updatedState;

      let lines = groupLayerElements.get('lines');
      let holes = groupLayerElements.get('holes');
      let items = groupLayerElements.get('items');
      let areas = groupLayerElements.get('areas');

      if( lines ) lines.forEach( lineID => { state = Line.select( state, groupLayerID, lineID ).updatedState; });
      if( holes ) holes.forEach( holeID => { state = Hole.select( state, groupLayerID, holeID ).updatedState; });
      if( items ) items.forEach( itemID => { state = Item.select( state, groupLayerID, itemID ).updatedState; });
      if( areas ) areas.forEach( areaID => { state = Area.select( state, groupLayerID, areaID ).updatedState; });
    });

    state = Project.setAlterate( state ).updatedState;

    let groups = state.getIn(['scene', 'groups']).map( g  => g.set('selected', false) );

    state = state.setIn(['scene', 'groups'], groups).setIn([ 'scene', 'groups', groupID, 'selected' ], true);

    return { updatedState: state };
  }

  static unselect( state, groupID ){
    let layerList = state.getIn([ 'scene', 'groups', groupID, 'elements' ]);
    let reduced = layerList.reduce( ( newState, layer, layerID ) => Layer.unselectAll( newState, layerID ).updatedState, state );
    state = reduced.setIn([ 'scene', 'groups', groupID, 'selected' ], false);

    return { updatedState: state };
  }

  static create( state ){
    let groupID = IDBroker.acquireID();

    state = state.setIn(['scene', 'groups', groupID], new GroupModel({ id: groupID, name: groupID}) );

    state = state.merge({
      sceneHistory: history.historyPush( state.sceneHistory, state.scene )
    });

    return { updatedState: state };
  }

  static createFromSelectedElements( state ){
    let groupID = IDBroker.acquireID();

    state = state.setIn(['scene', 'groups', groupID], new GroupModel({ id: groupID, name: groupID}) );

    state.getIn(['scene', 'layers']).forEach((layer) => {

      let layerID = layer.get('id');
      let layerElements = {
        'lines': layer.get('lines').filter( el => el.get('selected') ),
        'items': layer.get('items').filter( el => el.get('selected') ),
        'holes': layer.get('holes').filter( el => el.get('selected') ),
        'areas': layer.get('areas').filter( el => el.get('selected') )
      };

      for( let elementPrototype in layerElements ) {
        layerElements[elementPrototype].forEach( el => state = this.addElement( state, groupID, layerID, elementPrototype, el.get('id') ).updatedState );
      }
    });

    state = state.merge({
      sceneHistory: history.historyPush( state.sceneHistory, state.scene )
    });

    return {updatedState: state};
  }

  static addElement( state, groupID, layerID, elementPrototype, elementID ){
    let actualList = state.getIn(['scene', 'groups', groupID, 'elements', layerID, elementPrototype]) || new List();

    if( actualList.contains(elementID) )
    {
      return {updatedState: state};
    }

    state = state.setIn(['scene', 'groups', groupID, 'elements', layerID, elementPrototype], actualList.push(elementID));

    state = state.merge({
      sceneHistory: history.historyPush( state.sceneHistory, state.scene )
    });

    return { updatedState: state };
  }

  static removeElement( state, groupID, layerID, elementPrototype, elementID ) {
    let actualList = state.getIn(['scene', 'groups', groupID, 'elements', layerID, elementPrototype]);

    if( !actualList || !actualList.contains(elementID) )
    {
      return { updatedState: state };
    }

    state = state.setIn(['scene', 'groups', groupID, 'elements', layerID, elementPrototype], actualList.filterNot( el => el === elementID ));

    state = state.merge({
      sceneHistory: history.historyPush( state.sceneHistory, state.scene )
    });

    return { updatedState : state };
  }

  static setProperties( state, groupID, properties ){
    state = state.mergeIn(['scene', 'groups', groupID], properties);

    state = state.merge({
      sceneHistory: history.historyPush( state.sceneHistory, state.scene )
    });

    return { updatedState : state };
  }

  static remove( state, groupID ) {
    state = state.removeIn(['scene', 'groups', groupID]);

    state = state.merge({
      sceneHistory: history.historyPush( state.sceneHistory, state.scene )
    });

    return { updatedState : state };
  }

  static removeAndDeleteElements( state, groupID ) {
    let layerList = state.getIn([ 'scene', 'groups', groupID, 'elements' ]);

    layerList.entrySeq().forEach( ([groupLayerID, groupLayerElements]) => {
      state = Layer.unselectAll( state, groupLayerID ).updatedState;

      let lines = groupLayerElements.get('lines');
      let holes = groupLayerElements.get('holes');
      let items = groupLayerElements.get('items');
      let areas = groupLayerElements.get('areas');

      if( lines ) {
        lines.forEach( lineID => {
          state = Line.remove( state, groupLayerID, lineID ).updatedState;
          state = Layer.detectAndUpdateAreas( state, groupLayerID ).updatedState;
        });
      }

      if( holes ) holes.forEach( holeID => { state = Hole.remove( state, groupLayerID, holeID ).updatedState; });
      if( items ) items.forEach( itemID => { state = Item.remove( state, groupLayerID, itemID ).updatedState; });
      //( actually ) no effect by area's destruction
      if( false && areas ) areas.forEach( areaID => { state = Area.remove( state, groupLayerID, areaID ).updatedState; });

      state = state.deleteIn([ 'scene', 'groups', groupID ]);
    });

    state = state.merge({
      sceneHistory: history.historyPush( state.sceneHistory, state.scene )
    });

    return { updatedState: state };
  }

}

export { Group as default };
